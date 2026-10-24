import { Tabs } from 'expo-router';

import { BottomMenu, type BottomMenuItem } from '@/components/bottom-menu';

/** Bottom-menu items that have a screen in this group, keyed by item. Catch isn't built yet. */
const ROUTES: Partial<Record<BottomMenuItem, string>> = {
  gallery: 'gallery',
  map: 'map',
  rank: 'ranking',
  settings: 'settings',
};

export default function MainLayout() {
  return (
    <Tabs
      initialRouteName="ranking"
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => {
        const current = state.routes[state.index].name;
        const active = (Object.keys(ROUTES) as BottomMenuItem[]).find(
          (item) => ROUTES[item] === current,
        );
        return (
          <BottomMenu
            active={active ?? 'rank'}
            onSelect={(item) => {
              const route = ROUTES[item];
              if (route && route !== current) navigation.navigate(route);
            }}
          />
        );
      }}
    >
      <Tabs.Screen name="gallery" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="ranking" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
