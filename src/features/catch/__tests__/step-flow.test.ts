import { useCatchStore } from '@/features/catch';
import type { CatchCapture } from '@/features/catch/lifecycle';
import { createCatchStep, type CatchCameraAdapter } from '@/features/catch/step';
import type { VerifyCatchResult } from '@/features/verification/types';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'catch-1'),
}));

function capture(uri: string): CatchCapture {
  return {
    uri,
    bytes: new Uint8Array([1]),
    pHash: '0123456789abcdef',
    lat: 37.7,
    lng: -122.4,
    accuracyM: 5,
    at: '2026-10-26T00:00:00.000Z',
    mock: false,
  };
}

function fakeCamera(uri: string) {
  const adapter: CatchCameraAdapter & {
    takePhoto: jest.Mock<Promise<string>, []>;
    cancel: jest.Mock<void, []>;
  } = {
    permission: () => ({ granted: true, canAskAgain: true }),
    requestPermission: jest.fn(async () => {}),
    takePhoto: jest.fn(async () => uri),
    cancel: jest.fn(),
  };
  return adapter;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const verified: VerifyCatchResult = {
  verdict: 'verified',
  rejectionCode: null,
  reason: null,
  retry: null,
  xp: {
    already_awarded: false,
    xp_awarded: 25,
    total_xp: 25,
    current_streak: 1,
    longest_streak: 1,
  },
  alreadyVerified: false,
};

const store = () => useCatchStore.getState();

describe('two-step catch flow through the step seam', () => {
  beforeEach(() => {
    store().reset();
  });

  it('captures Find then Dispose, verifies, and settles one catch', async () => {
    const navigate = jest.fn();

    const findStep = createCatchStep({
      adapter: fakeCamera('find.jpg'),
      verify: async () => true,
      failureMessage: 'Find failed.',
      onCaptured: () => {
        store().found(capture('find.jpg'));
        navigate('/catch/dispose');
      },
    });
    findStep.cameraReady();
    await findStep.capture();

    expect(store().step).toBe('dispose');
    expect(navigate).toHaveBeenCalledWith('/catch/dispose');

    const disposeStep = createCatchStep({
      adapter: fakeCamera('dispose.jpg'),
      verify: async () => true,
      failureMessage: 'Dispose failed.',
      onCaptured: () => {
        store().disposed(capture('dispose.jpg'));
        navigate('/catch/verifying');
      },
    });
    disposeStep.cameraReady();
    await disposeStep.capture();

    expect(store().step).toBe('verifying');
    expect(navigate).toHaveBeenLastCalledWith('/catch/verifying');

    store().ensureCatchId();
    expect(store().verified(verified).status).toBe('completed');
  });

  it('does not record or navigate when Dispose is left during capture', async () => {
    store().found(capture('find.jpg'));

    const photo = deferred<string>();
    const camera = fakeCamera('dispose.jpg');
    camera.takePhoto.mockReturnValue(photo.promise);
    const navigate = jest.fn();

    const disposeStep = createCatchStep({
      adapter: camera,
      verify: async () => true,
      failureMessage: 'Dispose failed.',
      onCaptured: () => {
        store().disposed(capture('dispose.jpg'));
        navigate('/catch/verifying');
      },
    });
    disposeStep.cameraReady();

    const capturePromise = disposeStep.capture();
    disposeStep.cancel();
    photo.resolve('dispose.jpg');
    await capturePromise;

    expect(camera.cancel).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(store().dispose).toBeUndefined();
    expect(store().step).toBe('dispose');
  });

  it('does not move on when the privacy pipeline rejects the photo', async () => {
    store().found(capture('find.jpg'));

    const navigate = jest.fn();
    const disposeStep = createCatchStep({
      adapter: fakeCamera('dispose.jpg'),
      verify: async () => ({ pass: false, reason: 'too blurry.' }),
      failureMessage: 'Dispose failed.',
      onCaptured: () => {
        store().disposed(capture('dispose.jpg'));
        navigate('/catch/verifying');
      },
    });
    disposeStep.cameraReady();

    await disposeStep.capture();

    expect(disposeStep.getState().status).toBe('failed');
    expect(disposeStep.getState().failure).toBe('Catch failed: too blurry.');
    expect(navigate).not.toHaveBeenCalled();
    expect(store().dispose).toBeUndefined();
  });
});
