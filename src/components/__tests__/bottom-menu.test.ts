import { APP_TABS, TAB_LABELS, TAB_ROUTES, tabItemForRoute } from '../bottom-menu-routes';

describe('bottom menu tab routes', () => {
  it('covers exactly the app’s tab screens', () => {
    expect([...Object.values(TAB_ROUTES)].sort()).toEqual([...APP_TABS].sort());
  });

  it('has four tabs: Map, Gallery, Leaderboard and Profile', () => {
    expect(APP_TABS).toEqual(['map', 'my-catches', 'leaderboard', 'settings']);
  });

  it('labels the visible tabs Map, Gallery, Leaderboard and Profile', () => {
    expect(TAB_LABELS).toEqual({
      map: 'Map',
      'my-catches': 'Gallery',
      leaderboard: 'Leaderboard',
      profile: 'Profile',
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

  it('opens the private catch list at the Gallery route', () => {
    expect(TAB_ROUTES['my-catches']).toBe('my-catches');
    expect(APP_TABS).toContain('my-catches');
    expect(tabItemForRoute('my-catches')).toBe('my-catches');
    expect(APP_TABS).not.toContain('gallery');
  });

  it('opens the account hub from the Profile tab', () => {
    expect(TAB_ROUTES.profile).toBe('settings');
    expect(tabItemForRoute('settings')).toBe('profile');
  });

  it('keeps Profile lit on every Settings screen it opens', () => {
    expect(tabItemForRoute('settings/avatar')).toBe('profile');
    expect(tabItemForRoute('settings/username')).toBe('profile');
    expect(tabItemForRoute('settings/home-state')).toBe('profile');
    expect(tabItemForRoute('settings/delete')).toBe('profile');
    expect(tabItemForRoute('settings/about')).toBe('profile');
  });
});
