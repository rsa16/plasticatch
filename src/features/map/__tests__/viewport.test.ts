import {
  isValidViewport,
  pinsRequestArgs,
  stateScope,
  viewportFromVisibleBounds,
} from '../viewport';

describe('viewportFromVisibleBounds', () => {
  it('normalises Mapbox [ne, sw] bounds into the RPC envelope', () => {
    expect(
      viewportFromVisibleBounds([
        [-122.1, 37.9],
        [-122.7, 37.3],
      ]),
    ).toEqual({ west: -122.7, south: 37.3, east: -122.1, north: 37.9 });
  });

  it('is order-independent', () => {
    expect(
      viewportFromVisibleBounds([
        [-122.7, 37.3],
        [-122.1, 37.9],
      ]),
    ).toEqual({ west: -122.7, south: 37.3, east: -122.1, north: 37.9 });
  });

  it('rejects missing, degenerate, out-of-range and wrapped bounds', () => {
    expect(viewportFromVisibleBounds(null)).toBeNull();
    expect(
      viewportFromVisibleBounds([
        [0, 0],
        [0, 0],
      ]),
    ).toBeNull();
    expect(
      viewportFromVisibleBounds([
        [181, 0],
        [0, 10],
      ]),
    ).toBeNull();
    // Crossing the antimeridian would produce west >= east, which the RPC rejects.
    expect(
      viewportFromVisibleBounds([
        [179, 10],
        [-179, 0],
      ]),
    ).toBeNull();
  });
});

describe('isValidViewport', () => {
  it('requires finite, ordered, in-range corners', () => {
    expect(isValidViewport({ west: -10, south: -5, east: 10, north: 5 })).toBe(true);
    expect(isValidViewport({ west: 10, south: -5, east: -10, north: 5 })).toBe(false);
    expect(isValidViewport({ west: -10, south: 5, east: 10, north: -5 })).toBe(false);
    expect(isValidViewport({ west: -181, south: -5, east: 10, north: 5 })).toBe(false);
  });
});

describe('stateScope', () => {
  it('uses the home state only when My State is on', () => {
    expect(stateScope(true, 'or')).toBe('OR');
    expect(stateScope(true, ' OR ')).toBe('OR');
    expect(stateScope(false, 'OR')).toBeNull();
  });

  it('returns null when there is no usable home state', () => {
    expect(stateScope(true, null)).toBeNull();
    expect(stateScope(true, '')).toBeNull();
    expect(stateScope(true, 'Oregon')).toBeNull();
  });
});

describe('pinsRequestArgs', () => {
  it('always asks for active pins and passes the state scope', () => {
    const args = pinsRequestArgs({ west: -10, south: -5, east: 10, north: 5 }, 'OR', 500);

    expect(args).toMatchObject({
      p_west: -10,
      p_south: -5,
      p_east: 10,
      p_north: 5,
      p_limit: 500,
      p_active_only: true,
      p_state_code: 'OR',
      p_before_observed_at: null,
      p_before_id: null,
    });
  });

  it('passes both cursor values together on later pages', () => {
    const args = pinsRequestArgs({ west: -10, south: -5, east: 10, north: 5 }, null, 500, {
      observedAt: '2026-10-01T00:00:00Z',
      id: 42,
    });

    expect(args.p_state_code).toBeNull();
    expect(args.p_before_observed_at).toBe('2026-10-01T00:00:00Z');
    expect(args.p_before_id).toBe(42);
  });
});
