/** Every item the bottom menu can raise. Catch opens its own modal group, not a tab. */
export type BottomMenuItem = 'my-catches' | 'map' | 'catch' | 'leaderboard' | 'profile';

/** The bottom-menu items that open a tab in the app shell. */
export type TabMenuItem = Exclude<BottomMenuItem, 'catch'>;

/** Every screen the app shell exposes as a tab, in the order the tab navigator declares them. */
export const APP_TABS = ['map', 'my-catches', 'leaderboard', 'settings'] as const;

/** A screen name a tab route may point at. */
export type AppTabRoute = (typeof APP_TABS)[number];

/** The visible label for each tab. Each tab's label matches its route's screen. */
export const TAB_LABELS = {
  map: 'Map',
  'my-catches': 'Gallery',
  leaderboard: 'Leaderboard',
  profile: 'Profile',
} as const satisfies Record<TabMenuItem, string>;

/**
 * The app tab route each menu item opens. Typing this as a record means every tab item must
 * have exactly one route and that route must name an app tab.
 */
export const TAB_ROUTES = {
  'my-catches': 'my-catches',
  map: 'map',
  leaderboard: 'leaderboard',
  profile: 'settings',
} as const satisfies Record<TabMenuItem, AppTabRoute>;

/**
 * The menu item that owns a tab route, or `undefined` for a route no item opens. Screens with no
 * item, such as a deep link, leave the menu with nothing highlighted.
 *
 * Profile owns the whole Settings stack, so opening the avatar or username screen from the
 * Profile tab keeps that tab lit.
 */
export function tabItemForRoute(routeName: string): TabMenuItem | undefined {
  if (routeName === 'settings' || routeName.startsWith('settings/')) return 'profile';
  const items = Object.keys(TAB_ROUTES) as TabMenuItem[];
  return items.find((item) => TAB_ROUTES[item] === routeName);
}
