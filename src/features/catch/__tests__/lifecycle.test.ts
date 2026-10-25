import {
  CATCH_SUCCESS_RATE,
  completeCatch,
  disposeCatch,
  EMPTY_CATCH_STATE,
  findCatch,
  STEP_XP,
  verifyCatchPhoto,
} from '@/features/catch/lifecycle';

function foundState(photo = 'find.jpg') {
  return findCatch(EMPTY_CATCH_STATE, photo);
}

function disposedState(findPhoto = 'find.jpg', disposePhoto = 'dispose.jpg') {
  return disposeCatch(foundState(findPhoto), disposePhoto);
}

describe('catch photo verification', () => {
  it('passes half of all photos for now', () => {
    expect(CATCH_SUCCESS_RATE).toBe(0.5);
  });

  it('passes a photo when the injected roll is under the success rate', () => {
    expect(verifyCatchPhoto(() => 0)).toBe(true);
    expect(verifyCatchPhoto(() => 0.49)).toBe(true);
  });

  it('fails a photo when the injected roll is at or over the success rate', () => {
    expect(verifyCatchPhoto(() => 0.5)).toBe(false);
    expect(verifyCatchPhoto(() => 0.99)).toBe(false);
  });
});

describe('catch lifecycle', () => {
  it('starts at Find with no photos and no XP', () => {
    expect(EMPTY_CATCH_STATE).toStrictEqual({ step: 'find', xp: 0 });
  });

  it('walks Find then Dispose and awards each step once', () => {
    const found = foundState();
    expect(found).toStrictEqual({
      step: 'dispose',
      findPhoto: 'find.jpg',
      xp: STEP_XP,
    });

    const disposed = disposeCatch(found, 'dispose.jpg');
    expect(disposed).toStrictEqual({
      step: 'dispose',
      findPhoto: 'find.jpg',
      disposePhoto: 'dispose.jpg',
      xp: STEP_XP * 2,
    });
  });

  it('completes once both photos exist and keeps the completed catch available', () => {
    const disposed = disposedState();

    const { state, result } = completeCatch(disposed);

    const completion = {
      findPhoto: 'find.jpg',
      disposePhoto: 'dispose.jpg',
      xp: STEP_XP * 2,
    };
    expect(result).toStrictEqual({ status: 'completed', completion });
    expect(state).toStrictEqual({
      ...disposed,
      step: 'complete',
      completion,
    });
  });

  it('rejects Dispose before Find without changing state or awarding XP', () => {
    const next = disposeCatch(EMPTY_CATCH_STATE, 'dispose.jpg');

    expect(next).toBe(EMPTY_CATCH_STATE);
    expect(next.xp).toBe(0);
    expect(next.disposePhoto).toBeUndefined();
  });

  it('rejects completion before both photos exist', () => {
    const emptyResult = completeCatch(EMPTY_CATCH_STATE);
    const foundResult = completeCatch(foundState());

    expect(emptyResult.result).toStrictEqual({ status: 'rejected' });
    expect(emptyResult.state).toBe(EMPTY_CATCH_STATE);
    expect(foundResult.result).toStrictEqual({ status: 'rejected' });
    expect(foundResult.state.completion).toBeUndefined();
  });

  it('replaces a retaken photo without awarding XP again', () => {
    const firstFind = foundState('one.jpg');
    const retakenFind = findCatch(firstFind, 'two.jpg');

    expect(retakenFind.findPhoto).toBe('two.jpg');
    expect(retakenFind.xp).toBe(STEP_XP);

    const firstDispose = disposeCatch(retakenFind, 'back-one.jpg');
    const retakenDispose = disposeCatch(firstDispose, 'back-two.jpg');

    expect(retakenDispose.disposePhoto).toBe('back-two.jpg');
    expect(retakenDispose.xp).toBe(STEP_XP * 2);
  });

  it('rejects every transition after the catch is complete', () => {
    const completed = completeCatch(disposedState()).state;

    expect(findCatch(completed, 'another.jpg')).toBe(completed);
    expect(disposeCatch(completed, 'another.jpg')).toBe(completed);
    expect(completeCatch(completed).state).toBe(completed);
  });

  it('returns the same completion on repeat and never awards XP twice', () => {
    const first = completeCatch(disposedState());
    const second = completeCatch(first.state);

    expect(first.result.status).toBe('completed');
    expect(second.result).toStrictEqual({
      status: 'already-completed',
      completion: first.result.status === 'completed' ? first.result.completion : undefined,
    });
    expect(second.state).toBe(first.state);
    expect(second.state.xp).toBe(STEP_XP * 2);
  });
});
