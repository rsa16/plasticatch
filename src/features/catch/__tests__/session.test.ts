import {
  CATCH_SUCCESS_RATE,
  catchSessionReducer,
  EMPTY_CATCH_SESSION,
  STEP_XP,
  verifyCatchPhoto,
} from '@/features/catch';

describe('catch verification', () => {
  it('passes half of all photos for now', () => {
    expect(CATCH_SUCCESS_RATE).toBe(0.5);
  });

  it('passes a photo when the roll is under the success rate', () => {
    expect(verifyCatchPhoto(() => 0)).toBe(true);
    expect(verifyCatchPhoto(() => 0.49)).toBe(true);
  });

  it('fails a photo when the roll is at or over the success rate', () => {
    expect(verifyCatchPhoto(() => 0.5)).toBe(false);
    expect(verifyCatchPhoto(() => 0.99)).toBe(false);
  });
});

describe('catch session', () => {
  it('starts with no photos and no XP', () => {
    expect(EMPTY_CATCH_SESSION).toStrictEqual({ xp: 0 });
  });

  it('awards XP for each verified step', () => {
    const found = catchSessionReducer(EMPTY_CATCH_SESSION, { type: 'found', photo: 'find.jpg' });
    const disposed = catchSessionReducer(found, { type: 'disposed', photo: 'dispose.jpg' });

    expect(found.xp).toBe(STEP_XP);
    expect(disposed).toStrictEqual({
      findPhoto: 'find.jpg',
      disposePhoto: 'dispose.jpg',
      xp: STEP_XP * 2,
    });
  });

  it('keeps the newest photo without awarding a retaken step twice', () => {
    const first = catchSessionReducer(EMPTY_CATCH_SESSION, { type: 'found', photo: 'one.jpg' });
    const retaken = catchSessionReducer(first, { type: 'found', photo: 'two.jpg' });

    expect(retaken.findPhoto).toBe('two.jpg');
    expect(retaken.xp).toBe(STEP_XP);
  });

  it('starts over on reset', () => {
    const found = catchSessionReducer(EMPTY_CATCH_SESSION, { type: 'found', photo: 'find.jpg' });

    expect(catchSessionReducer(found, { type: 'reset' })).toStrictEqual(EMPTY_CATCH_SESSION);
  });
});
