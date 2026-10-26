import appConfig from '../../../../app.json';

type PluginEntry = string | [string, Record<string, unknown>];

const plugins = appConfig.expo.plugins as PluginEntry[];
const pluginNames = plugins.map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin));
const locationOptions = plugins.find(
  (plugin): plugin is [string, Record<string, unknown>] =>
    Array.isArray(plugin) && plugin[0] === 'expo-location',
)?.[1];

describe('app permissions config', () => {
  it('keeps the camera and foreground-location explainers', () => {
    expect(pluginNames).toContain('expo-camera');
    expect(pluginNames).toContain('expo-location');
    expect(locationOptions?.locationWhenInUsePermission).toEqual(expect.any(String));
  });

  it('never asks for background location', () => {
    expect(locationOptions?.isIosBackgroundLocationEnabled).not.toBe(true);
    expect(locationOptions?.isAndroidBackgroundLocationEnabled).not.toBe(true);
    expect(locationOptions?.locationAlwaysAndWhenInUsePermission).not.toEqual(expect.any(String));
    expect(locationOptions?.isAndroidForegroundServiceEnabled).not.toBe(true);
  });

  it('never adds the media library', () => {
    expect(pluginNames).not.toContain('expo-media-library');
    expect(pluginNames).not.toContain('expo-image-picker');
  });
});
