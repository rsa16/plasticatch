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
              const target = state.routes.find((route) => route.name === TAB_ROUTES[item]);
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
    </Tabs>
  );
}
