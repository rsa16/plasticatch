/** Every item the bottom menu can raise. Catch opens its own modal group, not a tab. */
export type BottomMenuItem = 'my-catches' | 'map' | 'catch' | 'leaderboard';

/** The bottom-menu items that open a tab in the app shell. */
export type TabMenuItem = Exclude<BottomMenuItem, 'catch'>;

/** Every screen the app shell exposes as a tab, in the order the tab navigator declares them. */
export const APP_TABS = ['map', 'my-catches', 'leaderboard'] as const;

/** A screen name a tab route may point at. */
export type AppTabRoute = (typeof APP_TABS)[number];

/** The visible label for each tab. Each tab's label matches its route's screen. */
export const TAB_LABELS = {
  map: 'Map',
  'my-catches': 'My Catches',
  leaderboard: 'Leaderboard',
} as const satisfies Record<TabMenuItem, string>;

/**
 * The app tab route each menu item opens. Typing this as a record means every tab item must
 * have exactly one route and that route must name an app tab.
 */
export const TAB_ROUTES = {
  'my-catches': 'my-catches',
  map: 'map',
  leaderboard: 'leaderboard',
} as const satisfies Record<TabMenuItem, AppTabRoute>;

/**
 * The menu item that owns a tab route, or `undefined` for a route no item opens. Screens with no
 * item, such as Settings or a deep link, leave the menu with nothing highlighted.
 */
export function tabItemForRoute(routeName: string): TabMenuItem | undefined {
  const items = Object.keys(TAB_ROUTES) as TabMenuItem[];
  return items.find((item) => TAB_ROUTES[item] === routeName);
}
