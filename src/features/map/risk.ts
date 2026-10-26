import { EPA_RISK_ATTRIBUTION } from '@/constants/map';

/** One row from `get_risk_areas_in_viewport`. */
export type RiskAreaRow = {
  risk_id: number | string;
  layer: string | null;
  density: number | string | null;
  ci_low: number | string | null;
  ci_high: number | string | null;
  state_code: string | null;
  snapshot_at: string | null;
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon | string | null;
  attribution?: string | null;
};

/** A modeled EPA grid cell. Density drives the ramp; the cell is never a press target. */
export type RiskCell = {
  id: number;
  density: number;
  ciLow: number | null;
  ciHigh: number | null;
  stateCode: string | null;
  snapshotAt: string | null;
  attribution: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
};

export type RiskFeatureProperties = {
  risk_id: number;
  density: number;
  state_code: string;
  snapshot_at: string;
};

/**
 * Map an RPC row onto a risk cell. A row without a finite density or a polygon cannot be drawn
 * and is dropped rather than rendered with a misleading colour.
 */
export function mapRiskAreaRow(row: RiskAreaRow): RiskCell | null {
  const id = toNumber(row.risk_id);
  const density = toNumber(row.density);
  const geometry = parseGeometry(row.geom);

  if (id === null || density === null || geometry === null) return null;

  return {
    id,
    density,
    ciLow: toNumber(row.ci_low),
    ciHigh: toNumber(row.ci_high),
    stateCode: row.state_code?.trim().toUpperCase() || null,
    snapshotAt: row.snapshot_at,
    attribution: row.attribution?.trim() || EPA_RISK_ATTRIBUTION,
    geometry,
  };
}

function parseGeometry(value: RiskAreaRow['geom']): GeoJSON.Polygon | GeoJSON.MultiPolygon | null {
  let geometry: unknown = value;

  if (typeof value === 'string') {
    try {
      geometry = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!geometry || typeof geometry !== 'object') return null;

  const candidate = geometry as { type?: unknown; coordinates?: unknown };
  if (candidate.type !== 'Polygon' && candidate.type !== 'MultiPolygon') return null;
  if (!Array.isArray(candidate.coordinates)) return null;

  return candidate as GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** The GeoJSON payload for the Mapbox fill layer. There is deliberately no press handler. */
export function riskFeatureCollection(
  cells: readonly RiskCell[],
): GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, RiskFeatureProperties> {
  return {
    type: 'FeatureCollection',
    features: cells.map((cell) => ({
      type: 'Feature',
      id: cell.id,
      geometry: cell.geometry,
      properties: {
        risk_id: cell.id,
        density: cell.density,
        state_code: cell.stateCode ?? '',
        snapshot_at: cell.snapshotAt ?? '',
      },
    })),
  };
}
