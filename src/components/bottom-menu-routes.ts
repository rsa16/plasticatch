import type { BottomMenuItem } from '@/components/bottom-menu';

/** The bottom-menu items that open a tab in the app shell. Catch opens its own modal group. */
export type TabMenuItem = Exclude<BottomMenuItem, 'catch'>;

/** Every screen the app shell exposes as a tab, in the order the tab navigator declares them. */
export const APP_TABS = ['my-catches', 'map', 'leaderboard', 'settings'] as const;

/** A screen name a tab route may point at. */
export type AppTabRoute = (typeof APP_TABS)[number];

/**
 * The app tab route each menu item opens. Typing this as a record means every tab item must
 * have exactly one route and that route must name an app tab.
 */
export const TAB_ROUTES = {
  'my-catches': 'my-catches',
  map: 'map',
  rank: 'leaderboard',
  settings: 'settings',
} as const satisfies Record<TabMenuItem, AppTabRoute>;

/**
 * The menu item that owns a tab route, or `undefined` for a route no item opens. Screens with no
 * item, such as a deep link, leave the menu with nothing highlighted.
 */
export function tabItemForRoute(routeName: string): TabMenuItem | undefined {
  const items = Object.keys(TAB_ROUTES) as TabMenuItem[];
  return items.find((item) => TAB_ROUTES[item] === routeName);
}
