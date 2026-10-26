import { EPA_RISK_LABEL } from '@/constants/map';

import { mapRiskAreaRow, riskFeatureCollection, type RiskAreaRow } from '../risk';

const ROW: RiskAreaRow = {
  risk_id: '510',
  layer: 'modeled_grid',
  density: '2.218387497411476',
  ci_low: '1.5472752945047568',
  ci_high: '3.588392847629848',
  state_code: 'CT',
  snapshot_at: '2024-09-01',
  geom: {
    type: 'Polygon',
    coordinates: [
      [
        [-73.0416505504028, 41.5500085036494],
        [-73.0333172123822, 41.5500085036494],
        [-73.0333172123822, 41.5583418421553],
        [-73.0416505504028, 41.5500085036494],
      ],
    ],
  },
  attribution: 'U.S. Environmental Protection Agency, Escaped Trash Risk Map',
};

describe('mapRiskAreaRow', () => {
  it('maps a risk RPC row and keeps the modeled snapshot label separate from the cell', () => {
    const cell = mapRiskAreaRow(ROW);

    expect(cell).toMatchObject({
      id: 510,
      density: 2.218387497411476,
      ciLow: 1.5472752945047568,
      ciHigh: 3.588392847629848,
      stateCode: 'CT',
      snapshotAt: '2024-09-01',
      attribution: 'U.S. Environmental Protection Agency, Escaped Trash Risk Map',
    });
    expect(cell?.geometry).toEqual(ROW.geom);
  });

  it('parses a GeoJSON string from the RPC', () => {
    const cell = mapRiskAreaRow({ ...ROW, geom: JSON.stringify(ROW.geom) });
    expect(cell?.geometry).toEqual(ROW.geom);
  });

  it('drops rows without a usable density or polygon', () => {
    expect(mapRiskAreaRow({ ...ROW, density: null })).toBeNull();
    expect(mapRiskAreaRow({ ...ROW, density: 'none' })).toBeNull();
    expect(mapRiskAreaRow({ ...ROW, geom: null })).toBeNull();
    expect(
      mapRiskAreaRow({
        ...ROW,
        geom: { type: 'Point', coordinates: [0, 0] } as unknown as RiskAreaRow['geom'],
      }),
    ).toBeNull();
  });

  it('uses the researched EPA attribution when the row has none', () => {
    expect(mapRiskAreaRow({ ...ROW, attribution: null })?.attribution).toContain(
      'Environmental Protection Agency',
    );
  });
});

describe('riskFeatureCollection', () => {
  it('builds a non-interactive polygon collection keyed by density', () => {
    const cell = mapRiskAreaRow(ROW);
    if (!cell) throw new Error('fixture failed to map');

    const collection = riskFeatureCollection([cell]);

    expect(collection.type).toBe('FeatureCollection');
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].properties).toMatchObject({
      risk_id: 510,
      density: 2.218387497411476,
      state_code: 'CT',
      snapshot_at: '2024-09-01',
    });
    expect(collection.features[0].geometry.type).toBe('Polygon');
  });

  it('names the modeled estimate exactly as the ticket requires', () => {
    expect(EPA_RISK_LABEL).toBe('EPA modeled estimate — Sept 2024 snapshot');
  });
});
