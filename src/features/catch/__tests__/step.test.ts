import {
  CAMERA_FAILURE_MESSAGE,
  createCatchStep,
  type CameraPermission,
  type CatchCameraAdapter,
} from '@/features/catch/step';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function createFakeAdapter() {
  const adapter: CatchCameraAdapter & {
    permission: jest.Mock<CameraPermission | null, []>;
    requestPermission: jest.Mock<Promise<void>, []>;
    takePhoto: jest.Mock<Promise<string>, []>;
    cancel: jest.Mock<void, []>;
  } = {
    permission: jest.fn(() => ({ granted: true, canAskAgain: true })),
    requestPermission: jest.fn(async () => {}),
    takePhoto: jest.fn(async () => 'photo.jpg'),
    cancel: jest.fn(),
  };
  return adapter;
}

function createStep(
  adapter: CatchCameraAdapter,
  overrides: Partial<Parameters<typeof createCatchStep>[0]> = {},
) {
  const onCaptured = jest.fn();
  const step = createCatchStep({
    adapter,
    verify: () => true,
    failureMessage: 'Step failed copy.',
    onCaptured,
    ...overrides,
  });
  return { step, onCaptured };
}

describe('catch step readiness', () => {
  it('stays not-ready until permission and the camera preview are both ready', () => {
    const adapter = createFakeAdapter();
    adapter.permission.mockReturnValue(null);
    const { step } = createStep(adapter);

    expect(step.getState().status).toBe('not-ready');
    step.capture();
    expect(adapter.takePhoto).not.toHaveBeenCalled();

    adapter.permission.mockReturnValue({ granted: true, canAskAgain: true });
    step.refreshPermission();
    expect(step.getState().status).toBe('not-ready');

    step.cameraReady();
    expect(step.getState().status).toBe('ready');
  });

  it('stays not-ready without camera permission even after the preview reports ready', () => {
    const adapter = createFakeAdapter();
    adapter.permission.mockReturnValue({ granted: false, canAskAgain: true });
    const { step } = createStep(adapter);

    step.cameraReady();

    expect(step.getState().status).toBe('not-ready');
    expect(step.getState().permission).toStrictEqual({ granted: false, canAskAgain: true });
  });

  it('asks the adapter for permission and re-reads the result', async () => {
    const adapter = createFakeAdapter();
    adapter.permission.mockReturnValue({ granted: false, canAskAgain: true });
    const { step } = createStep(adapter);

    adapter.permission.mockReturnValue({ granted: true, canAskAgain: true });
    await step.requestPermission();

    expect(adapter.requestPermission).toHaveBeenCalledTimes(1);
    expect(step.getState().permission).toStrictEqual({ granted: true, canAskAgain: true });

    step.cameraReady();
    expect(step.getState().status).toBe('ready');
  });

  it('does not reject or capture when the permission prompt rejects', async () => {
    const adapter = createFakeAdapter();
    adapter.permission.mockReturnValue({ granted: false, canAskAgain: true });
    adapter.requestPermission.mockRejectedValue(new Error('prompt failed'));
    const { step, onCaptured } = createStep(adapter);

    await expect(step.requestPermission()).resolves.toBeUndefined();

    expect(step.getState().status).toBe('not-ready');
    expect(onCaptured).not.toHaveBeenCalled();
  });

  it('returns to not-ready when permission is revoked', () => {
    const adapter = createFakeAdapter();
    const { step } = createStep(adapter);
    step.cameraReady();
    expect(step.getState().status).toBe('ready');

    adapter.permission.mockReturnValue({ granted: false, canAskAgain: false });
    step.refreshPermission();

    expect(step.getState().status).toBe('not-ready');
  });

  it('does not reopen the shutter after capture when permission refreshes', async () => {
    const adapter = createFakeAdapter();
    const { step } = createStep(adapter);
    step.cameraReady();

    await step.capture();
    step.refreshPermission();

    expect(step.getState().status).toBe('captured');
  });
});

describe('catch step capture', () => {
  it('captures, verifies, and reports one photo once', async () => {
    const adapter = createFakeAdapter();
    const photo = deferred<string>();
    adapter.takePhoto.mockReturnValue(photo.promise);
    const { step, onCaptured } = createStep(adapter, { verify: () => true });
    step.cameraReady();

    const capture = step.capture();
    expect(step.getState().status).toBe('capturing');
    expect(adapter.takePhoto).toHaveBeenCalledTimes(1);

    photo.resolve('find.jpg');
    await capture;

    expect(step.getState().status).toBe('captured');
    expect(onCaptured).toHaveBeenCalledTimes(1);
    expect(onCaptured).toHaveBeenCalledWith('find.jpg');
  });

  it('ignores a second capture request while one is in flight', async () => {
    const adapter = createFakeAdapter();
    const photo = deferred<string>();
    adapter.takePhoto.mockReturnValue(photo.promise);
    const { step, onCaptured } = createStep(adapter);
    step.cameraReady();

    const first = step.capture();
    const second = step.capture();

    expect(adapter.takePhoto).toHaveBeenCalledTimes(1);
    expect(step.getState().status).toBe('capturing');

    photo.resolve('find.jpg');
    await Promise.all([first, second]);

    expect(adapter.takePhoto).toHaveBeenCalledTimes(1);
    expect(onCaptured).toHaveBeenCalledTimes(1);

    // Captured is no longer ready, so a third press is ignored too.
    await step.capture();
    expect(adapter.takePhoto).toHaveBeenCalledTimes(1);
  });

  it('reports verifying while the injected verifier is pending', async () => {
    const adapter = createFakeAdapter();
    const photo = deferred<string>();
    const verdict = deferred<boolean>();
    adapter.takePhoto.mockReturnValue(photo.promise);
    const { step, onCaptured } = createStep(adapter, { verify: () => verdict.promise });
    step.cameraReady();

    const capture = step.capture();
    photo.resolve('find.jpg');
    await Promise.resolve();

    expect(step.getState().status).toBe('verifying');
    expect(onCaptured).not.toHaveBeenCalled();

    verdict.resolve(true);
    await capture;

    expect(step.getState().status).toBe('captured');
    expect(onCaptured).toHaveBeenCalledTimes(1);
  });

  it('ignores capture until the step is ready', async () => {
    const adapter = createFakeAdapter();
    adapter.permission.mockReturnValue(null);
    const { step } = createStep(adapter);

    await step.capture();

    expect(adapter.takePhoto).not.toHaveBeenCalled();
    expect(step.getState().status).toBe('not-ready');
  });
});

describe('catch step retake', () => {
  it('returns a captured step to ready without cancelling the camera', async () => {
    const adapter = createFakeAdapter();
    const { step } = createStep(adapter);
    step.cameraReady();
    await step.capture();

    expect(step.getState().status).toBe('captured');

    step.retake();

    expect(step.getState().status).toBe('ready');
    expect(step.getState().failure).toBeNull();
    expect(adapter.cancel).not.toHaveBeenCalled();
  });

  it('captures and reports a second photo after retake', async () => {
    const adapter = createFakeAdapter();
    adapter.takePhoto.mockResolvedValueOnce('first.jpg').mockResolvedValueOnce('second.jpg');
    const { step, onCaptured } = createStep(adapter);
    step.cameraReady();

    await step.capture();
    step.retake();
    await step.capture();

    expect(adapter.takePhoto).toHaveBeenCalledTimes(2);
    expect(onCaptured).toHaveBeenCalledTimes(2);
    expect(onCaptured).toHaveBeenLastCalledWith('second.jpg');
    expect(step.getState().status).toBe('captured');
  });

  it('ignores retake unless the step is captured', async () => {
    const adapter = createFakeAdapter();
    adapter.permission.mockReturnValue(null);
    const { step } = createStep(adapter);

    step.retake();
    expect(step.getState().status).toBe('not-ready');

    adapter.permission.mockReturnValue({ granted: true, canAskAgain: true });
    step.refreshPermission();
    step.cameraReady();
    step.retake();
    expect(step.getState().status).toBe('ready');

    const failed = createStep(createFakeAdapter(), { verify: () => false });
    failed.step.cameraReady();
    await failed.step.capture();
    failed.step.retake();
    expect(failed.step.getState().status).toBe('failed');
    expect(failed.step.getState().failure).toBe('Step failed copy.');
  });

  it('ignores retake after the step is cancelled', async () => {
    const adapter = createFakeAdapter();
    const { step } = createStep(adapter);
    step.cameraReady();
    await step.capture();

    step.cancel();
    step.retake();

    expect(step.getState().status).toBe('captured');
    expect(adapter.cancel).toHaveBeenCalledTimes(1);
  });
});

describe('catch step cancellation', () => {
  it('suppresses the verified callback when leaving during capture', async () => {
    const adapter = createFakeAdapter();
    const photo = deferred<string>();
    adapter.takePhoto.mockReturnValue(photo.promise);
    const { step, onCaptured } = createStep(adapter);
    step.cameraReady();

    const capture = step.capture();
    step.cancel();

    expect(adapter.cancel).toHaveBeenCalledTimes(1);
    expect(step.getState().status).toBe('not-ready');

    photo.resolve('find.jpg');
    await capture;

    expect(onCaptured).not.toHaveBeenCalled();
    expect(step.getState().status).toBe('not-ready');
  });

  it('suppresses the verified callback when leaving during verification', async () => {
    const adapter = createFakeAdapter();
    const photo = deferred<string>();
    const verdict = deferred<boolean>();
    adapter.takePhoto.mockReturnValue(photo.promise);
    const { step, onCaptured } = createStep(adapter, { verify: () => verdict.promise });
    step.cameraReady();

    const capture = step.capture();
    photo.resolve('find.jpg');
    await Promise.resolve();
    expect(step.getState().status).toBe('verifying');

    step.cancel();
    verdict.resolve(true);
    await capture;

    expect(onCaptured).not.toHaveBeenCalled();
  });

  it('makes cancellation idempotent and ignores new captures afterwards', async () => {
    const adapter = createFakeAdapter();
    const { step, onCaptured } = createStep(adapter);
    step.cameraReady();

    step.cancel();
    step.cancel();
    await step.capture();

    expect(adapter.cancel).toHaveBeenCalledTimes(1);
    expect(adapter.takePhoto).not.toHaveBeenCalled();
    expect(onCaptured).not.toHaveBeenCalled();
  });
});

describe('catch step failure', () => {
  it('shows the step failure copy when verification rejects, then allows a retry', async () => {
    const adapter = createFakeAdapter();
    const verify = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { step, onCaptured } = createStep(adapter, { verify });
    step.cameraReady();

    await step.capture();

    expect(step.getState().status).toBe('failed');
    expect(step.getState().failure).toBe('Step failed copy.');
    expect(onCaptured).not.toHaveBeenCalled();

    step.dismissFailure();
    expect(step.getState().status).toBe('ready');
    expect(step.getState().failure).toBeNull();

    await step.capture();

    expect(step.getState().status).toBe('captured');
    expect(onCaptured).toHaveBeenCalledTimes(1);
  });

  it('shows the camera failure copy when the adapter rejects', async () => {
    const adapter = createFakeAdapter();
    adapter.takePhoto.mockRejectedValue(new Error('camera unavailable'));
    const { step, onCaptured } = createStep(adapter);
    step.cameraReady();

    await step.capture();

    expect(step.getState().status).toBe('failed');
    expect(step.getState().failure).toBe(CAMERA_FAILURE_MESSAGE);
    expect(onCaptured).not.toHaveBeenCalled();
  });

  it('does not capture while the failure popup is still open', async () => {
    const adapter = createFakeAdapter();
    const { step } = createStep(adapter, { verify: () => false });
    step.cameraReady();

    await step.capture();
    await step.capture();

    expect(adapter.takePhoto).toHaveBeenCalledTimes(1);
    expect(step.getState().status).toBe('failed');
  });
});
