import { TAB_ROUTES, tabItemForRoute } from '../bottom-menu-routes';

describe('bottom menu tab routes', () => {
  it('maps every tab route back to the item that opened it', () => {
    for (const [item, route] of Object.entries(TAB_ROUTES)) {
      expect(tabItemForRoute(route)).toBe(item);
    }
  });

  it('returns undefined for a route no menu item owns', () => {
    expect(tabItemForRoute('index')).toBeUndefined();
    expect(tabItemForRoute('catch/find')).toBeUndefined();
  });
});
