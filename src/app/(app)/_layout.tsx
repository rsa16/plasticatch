import { router, Tabs } from 'expo-router';

import { BottomMenu } from '@/components/bottom-menu';
import { TAB_ROUTES, tabItemForRoute } from '@/components/bottom-menu-routes';

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
      <Tabs.Screen name="gallery" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="leaderboard" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
