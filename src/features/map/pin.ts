import {
  MAP_SPARSE_PIN_THRESHOLD,
  SOURCE_META,
  UNKNOWN_SOURCE,
  type SourceMeta,
} from '@/constants/map';

import { materialGroup } from './material';

/** A row from `get_litter_pins_in_viewport_v2`. */
export type LitterPinRow = {
  pin_id: number | string;
  source: string | null;
  source_id: string | null;
  longitude: number | string | null;
  latitude: number | string | null;
  observed_at: string | null;
  item: string | null;
  material: string | null;
  quantity: number | string | null;
  confidence: number | string | null;
  state_code: string | null;
  is_active: boolean | null;
  attribution?: string | null;
  license?: string | null;
};

/** A row from `get_olm_pins_in_viewport`; the ODbL table carries its own verified count. */
export type OlmPinRow = LitterPinRow & {
  verified?: number | string | null;
};

/** The view model a pin marker and its detail sheet use. Coordinates stay in the layer payload. */
export type MapPin = {
  id: number;
  source: string;
  sourceLabel: string;
  sourceId: string | null;
  longitude: number;
  latitude: number;
  observedAt: string;
  item: string | null;
  material: string | null;
  materialGroup: ReturnType<typeof materialGroup>;
  quantity: number;
  confidence: number | null;
  stateCode: string | null;
  attribution: string;
  license: string;
};

export type PinPage = {
  pins: MapPin[];
  /** True when the viewport has more matches than the documented pin cap. */
  truncated: boolean;
};

/** Source metadata for a raw `source` value, with a safe fallback for future sources. */
export function sourceMeta(source: string | null | undefined): SourceMeta {
  return SOURCE_META[source ?? ''] ?? UNKNOWN_SOURCE;
}

/** Rows the client cannot place or date are dropped rather than rendered at (0, 0). */
export function mapPinRow(row: LitterPinRow): MapPin | null {
  const longitude = toNumber(row.longitude);
  const latitude = toNumber(row.latitude);
  const id = toNumber(row.pin_id);
  const observedAt = row.observed_at;

  if (
    longitude === null ||
    latitude === null ||
    id === null ||
    !observedAt ||
    Number.isNaN(Date.parse(observedAt))
  ) {
    return null;
  }

  const meta = sourceMeta(row.source);

  return {
    id,
    source: row.source ?? 'unknown',
    sourceLabel: meta.label,
    sourceId: row.source_id,
    longitude,
    latitude,
    observedAt,
    item: row.item?.trim() || null,
    material: row.material?.trim() || null,
    materialGroup: materialGroup(row.material),
    quantity: toNumber(row.quantity) ?? 1,
    confidence: toNumber(row.confidence),
    stateCode: row.state_code?.trim().toUpperCase() || null,
    attribution: row.attribution?.trim() || meta.attribution,
    license: row.license?.trim() || meta.license,
  };
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** The label the pin sheet leads with: the fine-grained item, then material, then a fallback. */
export function pinTitle(pin: MapPin): string {
  return pin.item ?? pin.material ?? 'Litter';
}

const OBSERVED_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** A stable, locale-independent observed date for the sheet and tests. */
export function formatObservedDate(observedAt: string): string {
  const date = new Date(observedAt);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : OBSERVED_DATE_FORMAT.format(date);
}

/** The sparse-data rule: fewer than the threshold means the callout, never a blank map. */
export function isSparsePinView(
  pins: readonly MapPin[],
  threshold: number = MAP_SPARSE_PIN_THRESHOLD,
): boolean {
  return pins.length < threshold;
}

export type PinFeatureProperties = {
  pin_id: number;
  material_group: MapPin['materialGroup'];
  material: string;
  source: string;
};

/** The GeoJSON payload for the Mapbox circle layer. */
export function pinFeatureCollection(
  pins: readonly MapPin[],
): GeoJSON.FeatureCollection<GeoJSON.Point, PinFeatureProperties> {
  return {
    type: 'FeatureCollection',
    features: pins.map((pin) => ({
      type: 'Feature',
      id: pin.id,
      geometry: { type: 'Point', coordinates: [pin.longitude, pin.latitude] },
      properties: {
        pin_id: pin.id,
        material_group: pin.materialGroup,
        material: pin.material ?? '',
        source: pin.source,
      },
    })),
  };
}
