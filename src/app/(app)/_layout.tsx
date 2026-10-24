import { router, Tabs } from 'expo-router';

import { BottomMenu } from '@/components/bottom-menu';
import { APP_TABS, TAB_ROUTES, tabItemForRoute } from '@/components/bottom-menu-routes';

export default function AppLayout() {
  return (
    <Tabs
      initialRouteName="map"
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => {
        const current = state.routes[state.index].name;
        return (
          <BottomMenu
            active={tabItemForRoute(current)}
            onSelect={(item) => {
              // Catch lives in its own modal group, so the tab navigator cannot open it.
              if (item === 'catch') {
                router.push('/catch/find');
                return;
              }
              const route = TAB_ROUTES[item];
              if (route !== current) navigation.navigate(route);
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
