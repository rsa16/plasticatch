import type { BottomMenuItem } from '@/components/bottom-menu';

/** The bottom-menu items that open a tab in the app shell. Catch opens its own modal group. */
export type TabMenuItem = Exclude<BottomMenuItem, 'catch'>;

/**
 * The app tab route each menu item opens. Typing this as a record means every tab item must
 * have exactly one route and every route belongs to exactly one item.
 */
export const TAB_ROUTES = {
  gallery: 'gallery',
  map: 'map',
  rank: 'leaderboard',
  settings: 'settings',
} as const satisfies Record<TabMenuItem, string>;

/**
 * The menu item that owns a tab route, or `undefined` for a route no item opens. Screens with no
 * item, such as a deep link, leave the menu with nothing highlighted.
 */
export function tabItemForRoute(routeName: string): TabMenuItem | undefined {
  const items = Object.keys(TAB_ROUTES) as TabMenuItem[];
  return items.find((item) => TAB_ROUTES[item] === routeName);
}
