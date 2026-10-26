import { useCatchStore } from '@/features/catch';
import { STEP_XP, verifyCatchPhoto } from '@/features/catch/lifecycle';
import { createCatchStep, type CatchCameraAdapter } from '@/features/catch/step';

// The mock verifier is the default path when EXPO_PUBLIC_CATCH_VERIFIER is unset; pin its roll
// so the flow is deterministic. No real camera, no uncontrolled time, no unpinned randomness.
const verifiedPhoto = () => verifyCatchPhoto(() => 0);

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

const store = () => useCatchStore.getState();

describe('two-step catch flow through the step seam', () => {
  beforeEach(() => {
    store().reset();
  });

  it('captures Find then Dispose, verifies both, and completes exactly one catch', async () => {
    const record = jest.fn();
    const navigate = jest.fn();

    const findCamera = fakeCamera('find.jpg');
    const findStep = createCatchStep({
      adapter: findCamera,
      verify: verifiedPhoto,
      failureMessage: 'Find failed.',
      onCaptured: (photo) => {
        store().found(photo);
        navigate('/catch/dispose');
      },
    });
    findStep.cameraReady();
    await findStep.capture();

    expect(findCamera.takePhoto).toHaveBeenCalledTimes(1);
    expect(store().findPhoto).toBe('find.jpg');
    expect(store().xp).toBe(STEP_XP);
    expect(navigate).toHaveBeenCalledWith('/catch/dispose');

    const disposeCamera = fakeCamera('dispose.jpg');
    const disposeStep = createCatchStep({
      adapter: disposeCamera,
      verify: verifiedPhoto,
      failureMessage: 'Dispose failed.',
      onCaptured: (photo) => {
        store().disposed(photo);
        store().complete(record);
        navigate('/catch/complete');
      },
    });
    disposeStep.cameraReady();
    await disposeStep.capture();

    expect(disposeCamera.takePhoto).toHaveBeenCalledTimes(1);
    expect(store().disposePhoto).toBe('dispose.jpg');
    expect(store().xp).toBe(STEP_XP * 2);
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith({
      findPhoto: 'find.jpg',
      disposePhoto: 'dispose.jpg',
      xp: STEP_XP * 2,
    });
    expect(navigate).toHaveBeenLastCalledWith('/catch/complete');
  });

  it('does not complete, record, or navigate when Dispose is left during capture', async () => {
    store().found('find.jpg');

    const photo = deferred<string>();
    const disposeCamera = fakeCamera('dispose.jpg');
    disposeCamera.takePhoto.mockReturnValue(photo.promise);
    const record = jest.fn();
    const navigate = jest.fn();

    const disposeStep = createCatchStep({
      adapter: disposeCamera,
      verify: verifiedPhoto,
      failureMessage: 'Dispose failed.',
      onCaptured: (capturedPhoto) => {
        store().disposed(capturedPhoto);
        store().complete(record);
        navigate('/catch/complete');
      },
    });
    disposeStep.cameraReady();

    const capture = disposeStep.capture();
    disposeStep.cancel();
    photo.resolve('dispose.jpg');
    await capture;

    expect(disposeCamera.cancel).toHaveBeenCalledTimes(1);
    expect(record).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(store().disposePhoto).toBeUndefined();
    expect(store().completion).toBeUndefined();
    expect(store().xp).toBe(STEP_XP);
  });

  it('does not complete, record, or navigate when Dispose fails verification', async () => {
    store().found('find.jpg');

    const record = jest.fn();
    const navigate = jest.fn();
    const disposeStep = createCatchStep({
      adapter: fakeCamera('dispose.jpg'),
      verify: () => false,
      failureMessage: 'Dispose failed.',
      onCaptured: (capturedPhoto) => {
        store().disposed(capturedPhoto);
        store().complete(record);
        navigate('/catch/complete');
      },
    });
    disposeStep.cameraReady();

    await disposeStep.capture();

    expect(disposeStep.getState().status).toBe('failed');
    expect(disposeStep.getState().failure).toBe('Dispose failed.');
    expect(record).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(store().disposePhoto).toBeUndefined();
    expect(store().completion).toBeUndefined();
    expect(store().xp).toBe(STEP_XP);
  });
});
