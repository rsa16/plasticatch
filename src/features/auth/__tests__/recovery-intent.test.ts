import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  RECOVERY_INTENT_TTL_MS,
  forgetRecoveryRequest,
  hasRecoveryRequest,
  rememberRecoveryRequest,
} from '@/features/auth/recovery-intent';

describe('recovery intent', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('remembers a recent reset request', async () => {
    const now = Date.UTC(2026, 9, 26, 12);

    await rememberRecoveryRequest(now);

    await expect(hasRecoveryRequest(now + 60_000)).resolves.toBe(true);
  });

  it('ignores and clears a request older than the link lifetime', async () => {
    const now = Date.UTC(2026, 9, 26, 12);

    await rememberRecoveryRequest(now);

    await expect(hasRecoveryRequest(now + RECOVERY_INTENT_TTL_MS + 1)).resolves.toBe(false);
    // The expired marker is removed, not merely ignored on this read.
    await expect(AsyncStorage.getAllKeys()).resolves.toStrictEqual([]);
    await expect(hasRecoveryRequest(now + RECOVERY_INTENT_TTL_MS + 2)).resolves.toBe(false);
  });

  it('forgets a request once the callback has handled the link', async () => {
    await rememberRecoveryRequest();
    await forgetRecoveryRequest();

    await expect(hasRecoveryRequest()).resolves.toBe(false);
  });

  it('reports no request when nothing was ever stored', async () => {
    await expect(hasRecoveryRequest()).resolves.toBe(false);
  });
});
