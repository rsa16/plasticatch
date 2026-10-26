/**
 * Jest cannot load the native AsyncStorage module, so swap in the package's own in-memory mock.
 * The auth store only uses it for session persistence, which tests never exercise for real.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
