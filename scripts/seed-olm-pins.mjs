#!/usr/bin/env node
/**
 * One-off, bounded OpenLitterMap seed for the demo-state bboxes (ticket 33).
 *
 * Reproducible inputs:
 *   - fixed demo-state bboxes, zoom 15 (the OLM API requires zoom >= 15)
 *   - a fixed date window (override with OLM_FROM / OLM_TO)
 *   - per_page 500 and a hard page cap
 *
 * The script flattens `summary.tags` into item/material/quantity and posts the batch to the
 * service-role-only `import_olm_features` RPC, which upserts on `(source, source_id)`.
 *
 * Usage (needs service-role credentials; never commit them):
 *   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
 *   node scripts/seed-olm-pins.mjs
 *
 * To produce a JSON payload for a reviewed/manual import instead of writing to the database:
 *   node scripts/seed-olm-pins.mjs --dump /tmp/olm-seed.json
 */

const OLM_POINTS_URL = 'https://openlittermap.com/api/points';
const OLM_ZOOM = 15;
const PER_PAGE = 500;
const MAX_PAGES = 10;
const DEFAULT_FROM = '2024-10-26';
const DEFAULT_TO = '2026-10-26';
const IMPORT_RPC = 'import_olm_features';
const IMPORT_CHUNK = 500;

/** The same demo states as the seeded EPA layer; single-state bboxes at zoom 15. */
export const DEMO_STATE_BBOXES = [
  { state: 'NY', label: 'New York', left: -79.8, bottom: 40.5, right: -71.9, top: 45.0 },
  { state: 'PA', label: 'Pennsylvania', left: -80.5, bottom: 39.7, right: -74.7, top: 42.3 },
  { state: 'NJ', label: 'New Jersey', left: -75.6, bottom: 38.9, right: -73.9, top: 41.4 },
  { state: 'FL', label: 'Florida', left: -87.7, bottom: 24.4, right: -80.0, top: 31.0 },
  { state: 'CT', label: 'Connecticut', left: -73.8, bottom: 40.9, right: -71.8, top: 42.1 },
];

function bboxQuery(bbox, from, to, page) {
  const params = new URLSearchParams({
    'bbox[left]': String(bbox.left),
    'bbox[bottom]': String(bbox.bottom),
    'bbox[right]': String(bbox.right),
    'bbox[top]': String(bbox.top),
    zoom: String(OLM_ZOOM),
    per_page: String(PER_PAGE),
    page: String(page),
    from,
    to,
  });
  return `${OLM_POINTS_URL}?${params.toString()}`;
}

function humanize(key) {
  return typeof key === 'string' && key.length > 0 ? key.replaceAll('_', ' ') : null;
}

function firstDefined(keys, ids, collection) {
  if (!Array.isArray(ids)) return null;
  for (const id of ids) {
    const value = keys?.[collection]?.[String(id)];
    if (typeof value === 'string' && value.length > 0) return humanize(value);
  }
  return null;
}

function allDefined(keys, ids, collection) {
  if (!Array.isArray(ids)) return [];
  const values = ids
    .map((id) => keys?.[collection]?.[String(id)])
    .filter((value) => typeof value === 'string' && value.length > 0)
    .map(humanize);
  return [...new Set(values)];
}

/** Flatten one OLM GeoJSON feature into the import row shape. */
export function flattenOlmFeature(feature) {
  const properties = feature?.properties ?? {};
  const coordinates = feature?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  if (properties.id === null || properties.id === undefined) return null;

  const summary = properties.summary ?? {};
  const keys = summary.keys ?? {};
  const tags = Array.isArray(summary.tags) ? summary.tags : [];

  const item = firstDefined(
    keys,
    tags.map((tag) => tag.object_id),
    'objects',
  );
  const materials = allDefined(
    keys,
    tags.flatMap((tag) => (Array.isArray(tag.materials) ? tag.materials : [])),
    'materials',
  );
  const tagQuantity = tags.reduce(
    (total, tag) => total + (Number.isFinite(Number(tag.quantity)) ? Number(tag.quantity) : 0),
    0,
  );
  const quantity = Number.isFinite(Number(summary.totals?.litter))
    ? Number(summary.totals.litter)
    : tagQuantity;
  const verified = Number.isFinite(Number(properties.verified)) ? Number(properties.verified) : 0;

  return {
    source_id: String(properties.id),
    longitude: Number(coordinates[0]),
    latitude: Number(coordinates[1]),
    observed_at: properties.datetime ?? null,
    item,
    material: materials.length > 0 ? materials.join(', ') : null,
    quantity,
    confidence: verified >= 2 ? 0.9 : verified >= 1 ? 0.5 : null,
    verified,
    raw: feature,
  };
}

async function fetchBbox(bbox, from, to) {
  const features = [];
  let page = 1;
  let lastPage = 1;

  while (page <= Math.min(lastPage, MAX_PAGES)) {
    const response = await fetch(bboxQuery(bbox, from, to, page), {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`OLM ${bbox.state} page ${page} failed: HTTP ${response.status}`);
    }

    const body = await response.json();
    const pageFeatures = Array.isArray(body.features) ? body.features : [];
    features.push(...pageFeatures);
    lastPage = Number.isFinite(Number(body.last_page)) ? Number(body.last_page) : page;

    if (pageFeatures.length < PER_PAGE) break;
    page += 1;
  }

  return features;
}

async function main() {
  const args = process.argv.slice(2);
  const dumpIndex = args.indexOf('--dump');
  const dumpPath = dumpIndex >= 0 ? args[dumpIndex + 1] : null;
  const from = process.env.OLM_FROM ?? DEFAULT_FROM;
  const to = process.env.OLM_TO ?? DEFAULT_TO;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!dumpPath && (!url || !serviceKey)) {
    throw new Error(
      'Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or pass --dump <file>.',
    );
  }

  const records = new Map();
  for (const bbox of DEMO_STATE_BBOXES) {
    const features = await fetchBbox(bbox, from, to);
    let mapped = 0;

    for (const feature of features) {
      const record = flattenOlmFeature(feature);
      if (!record) continue;
      records.set(record.source_id, record);
      mapped += 1;
    }

    console.log(
      `${bbox.state}: ${features.length} fetched, ${mapped} mappable, ${records.size} unique so far`,
    );
  }

  const payload = [...records.values()];
  console.log(`Seed window ${from}..${to}; ${payload.length} unique OLM features.`);

  if (dumpPath) {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(dumpPath, JSON.stringify(payload, null, 2));
    console.log(`Wrote ${payload.length} rows to ${dumpPath}; no database writes performed.`);
    return;
  }

  let insertedOrUpdated = 0;
  for (let offset = 0; offset < payload.length; offset += IMPORT_CHUNK) {
    const chunk = payload.slice(offset, offset + IMPORT_CHUNK);
    const response = await fetch(`${url}/rest/v1/rpc/${IMPORT_RPC}`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_features: chunk }),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        `Import chunk at ${offset} failed: HTTP ${response.status} ${JSON.stringify(body)}`,
      );
    }
    insertedOrUpdated += Number(body?.inserted_or_updated ?? 0);
    console.log(`Imported chunk ${offset / IMPORT_CHUNK + 1}: ${JSON.stringify(body)}`);
  }

  console.log(`Done. ${insertedOrUpdated} OLM rows inserted or updated.`);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
