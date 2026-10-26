import { router, Tabs } from 'expo-router';

import { BottomMenu } from '@/components/bottom-menu';
import { APP_TABS, TAB_ROUTES, tabItemForRoute } from '@/components/bottom-menu-routes';

// Expo Router reads the tab that opens first from here; `Tabs` no longer takes `initialRouteName`.
export const unstable_settings = { anchor: 'map' };

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, emitter, navigateToTab }) => {
        const current = state.routes[state.index];
        return (
          <BottomMenu
            active={tabItemForRoute(current.name)}
            onSelect={(item) => {
              // Catch lives in its own modal group, so the tab navigator cannot open it.
              if (item === 'catch') {
                router.push('/catch/find');
                return;
              }
              const routeName = TAB_ROUTES[item];
              const target = state.routes.find((route) => route.name === routeName);
              if (!target || target.key === current.key) return;
              // Emit tabPress like the default tab bar so screens can still listen for it.
              const event = emitter.emit({
                type: 'tabPress',
                target: target.key,
                canPreventDefault: true,
              });
              if (!event.defaultPrevented) navigateToTab(target.key);
            }}
          />
        );
      }}
    >
      {APP_TABS.map((name) => (
        <Tabs.Screen key={name} name={name} />
      ))}
      {/* Settings opens from the avatar button. It is not in APP_TABS, so the menu never shows it. */}
      <Tabs.Screen name="settings" />
      {/* Reached from the map's persistent Data sources link; hidden from the custom tab bar. */}
      <Tabs.Screen name="settings/about" />
      {/* Settings account rows. Not tabs: the custom bar only lists APP_TABS. */}
      <Tabs.Screen name="settings/username" />
      <Tabs.Screen name="settings/home-state" />
    </Tabs>
  );
}
