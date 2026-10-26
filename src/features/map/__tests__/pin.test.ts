import { MAP_SPARSE_PIN_THRESHOLD } from '@/constants/map';

import {
  formatObservedDate,
  isSparsePinView,
  mapPinRow,
  pinFeatureCollection,
  pinTitle,
  sourceMeta,
  type LitterPinRow,
  type MapPin,
} from '../pin';

const ROW: LitterPinRow = {
  pin_id: '7',
  source: 'debris_tracker',
  source_id: 'dt-7',
  longitude: '-122.6',
  latitude: '45.5',
  observed_at: '2026-10-01T12:30:00Z',
  item: 'Bottle cap',
  material: 'PLASTIC',
  quantity: '2',
  confidence: '0.9',
  state_code: 'OR',
  is_active: true,
};

function pin(overrides: Partial<MapPin> = {}): MapPin {
  const mapped = mapPinRow(ROW);
  if (!mapped) throw new Error('fixture failed to map');
  return { ...mapped, ...overrides };
}

describe('mapPinRow', () => {
  it('maps an RPC row onto the pin view model', () => {
    const mapped = mapPinRow(ROW);

    expect(mapped).toMatchObject({
      id: 7,
      source: 'debris_tracker',
      sourceLabel: 'Debris Tracker',
      sourceId: 'dt-7',
      longitude: -122.6,
      latitude: 45.5,
      observedAt: '2026-10-01T12:30:00Z',
      item: 'Bottle cap',
      material: 'PLASTIC',
      materialGroup: 'plastic',
      quantity: 2,
      confidence: 0.9,
      stateCode: 'OR',
      attribution: 'Marine Debris Tracker (debristracker.org)',
    });
    expect(mapped).not.toHaveProperty('coordinates');
  });

  it('drops rows that cannot be placed or dated', () => {
    expect(mapPinRow({ ...ROW, longitude: null })).toBeNull();
    expect(mapPinRow({ ...ROW, latitude: 'north' })).toBeNull();
    expect(mapPinRow({ ...ROW, observed_at: null })).toBeNull();
    expect(mapPinRow({ ...ROW, observed_at: 'not a date' })).toBeNull();
    expect(mapPinRow({ ...ROW, pin_id: 'NaN' })).toBeNull();
  });

  it('falls back to a neutral source label for unknown sources', () => {
    expect(sourceMeta('a_future_source')).toMatchObject({ label: 'Litter observation' });
  });
});

describe('pinTitle', () => {
  it('prefers the fine item, then material, then a generic label', () => {
    expect(pinTitle(pin({ item: 'Bottle cap' }))).toBe('Bottle cap');
    expect(pinTitle(pin({ item: null, material: 'GLASS' }))).toBe('GLASS');
    expect(pinTitle(pin({ item: null, material: null }))).toBe('Litter');
  });
});

describe('formatObservedDate', () => {
  it('formats a UTC observation date and handles bad input', () => {
    expect(formatObservedDate('2026-10-01T12:30:00Z')).toBe('Oct 1, 2026');
    expect(formatObservedDate('nonsense')).toBe('Date unavailable');
  });
});

describe('isSparsePinView', () => {
  it('uses the documented sparse threshold', () => {
    expect(isSparsePinView([])).toBe(true);
    expect(isSparsePinView(Array.from({ length: MAP_SPARSE_PIN_THRESHOLD - 1 }, () => pin()))).toBe(
      true,
    );
    expect(isSparsePinView(Array.from({ length: MAP_SPARSE_PIN_THRESHOLD }, () => pin()))).toBe(
      false,
    );
  });
});

describe('pinFeatureCollection', () => {
  it('builds material-keyed GeoJSON and keeps coordinates in the layer payload only', () => {
    const collection = pinFeatureCollection([pin()]);

    expect(collection.type).toBe('FeatureCollection');
    expect(collection.features[0].geometry).toEqual({
      type: 'Point',
      coordinates: [-122.6, 45.5],
    });
    expect(collection.features[0].properties).toMatchObject({
      pin_id: 7,
      material_group: 'plastic',
      source: 'debris_tracker',
    });
  });
});
