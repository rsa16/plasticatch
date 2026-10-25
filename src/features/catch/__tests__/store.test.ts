import { useCatchStore } from '@/features/catch';
import { STEP_XP } from '@/features/catch/lifecycle';

const store = () => useCatchStore.getState();

describe('catch store', () => {
  beforeEach(() => {
    store().reset();
  });

  it('awards step XP once, even when a step is retaken', () => {
    store().found('find-one.jpg');
    store().found('find-two.jpg');

    expect(store().findPhoto).toBe('find-two.jpg');
    expect(store().xp).toBe(STEP_XP);

    store().disposed('dispose-one.jpg');
    store().disposed('dispose-two.jpg');

    expect(store().disposePhoto).toBe('dispose-two.jpg');
    expect(store().xp).toBe(STEP_XP * 2);
  });

  it('does not record a completion before both photos exist', () => {
    const record = jest.fn();

    const result = store().complete(record);

    expect(result).toStrictEqual({ status: 'rejected' });
    expect(record).not.toHaveBeenCalled();
    expect(store().completion).toBeUndefined();
    expect(store().xp).toBe(0);
  });

  it('records one completion exactly once across repeated calls', () => {
    const record = jest.fn();

    store().found('find.jpg');
    store().disposed('dispose.jpg');

    const first = store().complete(record);
    const second = store().complete(record);
    const third = store().complete();

    const completion = {
      findPhoto: 'find.jpg',
      disposePhoto: 'dispose.jpg',
      xp: STEP_XP * 2,
    };
    expect(first).toStrictEqual({ status: 'completed', completion });
    expect(second).toStrictEqual({ status: 'already-completed', completion });
    expect(third).toStrictEqual({ status: 'already-completed', completion });
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(completion);
    expect(store().completion).toStrictEqual(completion);
    expect(store().xp).toBe(STEP_XP * 2);
  });

  it('keeps the completed catch visible until the flow is dismissed', () => {
    store().found('find.jpg');
    store().disposed('dispose.jpg');
    store().complete();

    expect(store().step).toBe('complete');
    expect(store().findPhoto).toBe('find.jpg');
    expect(store().disposePhoto).toBe('dispose.jpg');
    expect(store().completion).toBeDefined();
  });

  it('resets every field and allows a new catch afterwards', () => {
    const record = jest.fn();

    store().found('find.jpg');
    store().disposed('dispose.jpg');
    store().complete(record);

    store().reset();

    expect(store().step).toBe('find');
    expect(store().findPhoto).toBeUndefined();
    expect(store().disposePhoto).toBeUndefined();
    expect(store().completion).toBeUndefined();
    expect(store().xp).toBe(0);

    store().found('next-find.jpg');
    store().disposed('next-dispose.jpg');
    store().complete(record);

    expect(record).toHaveBeenCalledTimes(2);
    expect(record).toHaveBeenLastCalledWith({
      findPhoto: 'next-find.jpg',
      disposePhoto: 'next-dispose.jpg',
      xp: STEP_XP * 2,
    });
  });
});
