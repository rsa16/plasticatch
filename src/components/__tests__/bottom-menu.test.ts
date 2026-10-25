import { APP_TABS, TAB_ROUTES, tabItemForRoute } from '../bottom-menu-routes';

describe('bottom menu tab routes', () => {
  it('covers exactly the app’s tab screens', () => {
    expect([...Object.values(TAB_ROUTES)].sort()).toEqual([...APP_TABS].sort());
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

  it('opens the private list as My Catches', () => {
    expect(TAB_ROUTES['my-catches']).toBe('my-catches');
    expect(APP_TABS).toContain('my-catches');
    expect(tabItemForRoute('my-catches')).toBe('my-catches');
    expect(APP_TABS).not.toContain('gallery');
  });
});
