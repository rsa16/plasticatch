import { APP_TABS, TAB_LABELS, TAB_ROUTES, tabItemForRoute } from '../bottom-menu-routes';

describe('bottom menu tab routes', () => {
  it('covers exactly the app’s tab screens', () => {
    expect([...Object.values(TAB_ROUTES)].sort()).toEqual([...APP_TABS].sort());
  });

  it('has exactly the three V1 tabs', () => {
    expect(APP_TABS).toEqual(['map', 'my-catches', 'leaderboard']);
  });

  it('labels the visible tabs Map, My Catches and Leaderboard', () => {
    expect(TAB_LABELS).toEqual({
      map: 'Map',
      'my-catches': 'My Catches',
      leaderboard: 'Leaderboard',
    });
  });

  it('maps every tab route back to the item that opened it', () => {
    for (const [item, route] of Object.entries(TAB_ROUTES)) {
      expect(tabItemForRoute(route)).toBe(item);
    }
  });

  it('returns undefined for a route no menu item owns', () => {
    expect(tabItemForRoute('index')).toBeUndefined();
    expect(tabItemForRoute('catch/find')).toBeUndefined();
  });

  it('keeps Settings routable but out of the tab bar', () => {
    expect(APP_TABS).not.toContain('settings');
    expect(Object.values(TAB_ROUTES)).not.toContain('settings');
    // Settings has no menu item, so no tab is highlighted while it is open.
    expect(tabItemForRoute('settings')).toBeUndefined();
  });

  it('opens the private list as My Catches', () => {
    expect(TAB_ROUTES['my-catches']).toBe('my-catches');
    expect(APP_TABS).toContain('my-catches');
    expect(tabItemForRoute('my-catches')).toBe('my-catches');
    expect(APP_TABS).not.toContain('gallery');
  });
});
