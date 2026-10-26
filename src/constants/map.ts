/**
 * Map constants shared by the viewport query, the Mapbox layers and the Data sources screen.
 *
 * Nothing here imports the native Mapbox module: the web export and Jest can load this file.
 */

/** The public Mapbox token. Only the name belongs in the repo; the value lives in `.env`. */
export const MAPBOX_TOKEN_ENV = 'EXPO_PUBLIC_MAPBOX_TOKEN';

/** `@rnmapbox/maps` version the mobile client is built against (see ADR-0002). */
export const MAPBOX_MAPS_VERSION = '10.3.11';

/**
 * The RPC caps a page at 1,000 rows. The client asks for 500 and fetches at most two pages, so a
 * zoomed-out viewport stops at 1,000 newest active pins instead of trying to draw the whole world.
 */
export const MAP_PIN_PAGE_LIMIT = 500;
export const MAP_PIN_MAX_PAGES = 2;
export const MAP_PIN_MAX_PINS = MAP_PIN_PAGE_LIMIT * MAP_PIN_MAX_PAGES;

/** A viewport with fewer active pins than this gets the sparse-data callout, never a blank map. */
export const MAP_SPARSE_PIN_THRESHOLD = 5;

/** Where the camera starts before the first viewport query resolves: the continental US. */
export const MAP_DEFAULT_CENTER: readonly [number, number] = [-98.5795, 39.8283];
export const MAP_DEFAULT_ZOOM = 3;

/** The eight source-taxonomy buckets that drive pin colour. */
export const MATERIAL_GROUPS = [
  'plastic',
  'paper',
  'metal',
  'glass',
  'cloth',
  'rubber',
  'fishing',
  'other',
] as const;

export type MaterialGroup = (typeof MATERIAL_GROUPS)[number];

/** Pin colours, one per `material` group. Chosen to stay distinguishable over Mapbox Outdoors. */
export const MATERIAL_COLORS: Readonly<Record<MaterialGroup, string>> = {
  plastic: '#2f7d63',
  paper: '#b7791f',
  metal: '#4b5563',
  glass: '#2563eb',
  cloth: '#7c3aed',
  rubber: '#b45309',
  fishing: '#0e7490',
  other: '#6b7280',
};

/** Human labels for the pin sheet and the map legend. */
export const MATERIAL_LABELS: Readonly<Record<MaterialGroup, string>> = {
  plastic: 'Plastic',
  paper: 'Paper & wood',
  metal: 'Metal',
  glass: 'Glass',
  cloth: 'Cloth & textiles',
  rubber: 'Rubber',
  fishing: 'Fishing gear',
  other: 'Other',
};

/** Row-level attribution shown in the pin sheet when the RPC does not carry `attribution`. */
export type SourceMeta = {
  label: string;
  attribution: string;
  license: string;
};

export const SOURCE_META: Readonly<Record<string, SourceMeta>> = {
  debris_tracker: {
    label: 'Debris Tracker',
    attribution: 'Marine Debris Tracker (debristracker.org)',
    license: 'Used with attribution; written permission pending before public release',
  },
  openlittermap: {
    label: 'OpenLitterMap',
    attribution: 'OpenLitterMap (openlittermap.com)',
    license: 'ODbL 1.0 — share-alike, kept isolated in its own table and layer',
  },
  seeded: {
    label: 'PlastiCatch demo',
    attribution: 'Synthetic PlastiCatch demo data',
    license: 'Synthetic demo row; not a real litter observation',
  },
};

/** The fallback used when a new source appears before this map is updated. */
export const UNKNOWN_SOURCE: SourceMeta = {
  label: 'Litter observation',
  attribution: 'Source attribution unavailable',
  license: 'License unavailable',
};

/** The persistent Data sources / About screen's list. Stamps match the seeded data in the DB. */
export const DATA_SOURCES = [
  {
    name: 'Debris Tracker',
    role: 'Ground-truth litter pins',
    attribution: 'Marine Debris Tracker (debristracker.org)',
    snapshot: 'Seeded snapshot: 26 October 2026',
    license: 'Demo use with attribution; written permission pending before public release.',
  },
  {
    name: 'OpenLitterMap',
    role: 'Licensed ground-truth fallback (own toggle in V1.1)',
    attribution: 'OpenLitterMap (openlittermap.com)',
    snapshot: 'No OpenLitterMap pins are seeded in V1',
    license: 'ODbL 1.0 — share-alike. Its data stays isolated in a separate table and layer.',
  },
  {
    name: 'EPA Escaped Trash Risk Map',
    role: 'Modeled risk layer, toggle-only and never clickable',
    attribution: 'US Environmental Protection Agency, Escaped Trash Risk Map (layer 19)',
    snapshot: 'Modeled estimate — September 2024 snapshot',
    license: 'EPA public data; modeled estimate, not an observation.',
  },
  {
    name: 'Mapbox',
    role: 'Map base style and rendering',
    attribution: '© Mapbox, © OpenStreetMap contributors',
    snapshot: `@rnmapbox/maps ${MAPBOX_MAPS_VERSION} · Mapbox Outdoors`,
    license: 'Mapbox Terms of Service and OpenStreetMap attribution apply.',
  },
] as const;
