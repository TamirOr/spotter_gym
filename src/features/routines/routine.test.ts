import {
  canSave,
  draftOf,
  nameDay,
  NEW_ROUTINE,
  selectedDays,
  timesPerWeekOptions,
  toggleDay,
  type RoutineDraft,
} from './routine';

const gym: RoutineDraft = { activityId: 'gym', timesPerWeek: 2, days: [] };

describe('toggleDay', () => {
  it('keeps days in week order', () => {
    const draft = toggleDay(toggleDay(gym, 'TH'), 'MO');
    expect(selectedDays(draft)).toEqual(['MO', 'TH']);
  });

  it('removes a chosen day', () => {
    expect(selectedDays(toggleDay(toggleDay(gym, 'MO'), 'MO'))).toEqual([]);
  });

  it('adds a session when there are more days than sessions', () => {
    const draft = toggleDay(toggleDay(toggleDay(gym, 'SU'), 'TU'), 'TH');
    expect(draft.timesPerWeek).toBe(3);
  });

  it('keeps the sessions when a day is removed', () => {
    const draft = toggleDay(toggleDay(toggleDay(gym, 'SU'), 'TU'), 'SU');
    expect(draft.timesPerWeek).toBe(2);
  });
});

describe('nameDay', () => {
  it('names one day only', () => {
    const draft = nameDay(toggleDay(toggleDay(gym, 'MO'), 'TH'), 'MO', 'Leg day');
    expect(draft.days).toEqual([
      { weekday: 'MO', name: 'Leg day' },
      { weekday: 'TH', name: '' },
    ]);
  });
});

describe('timesPerWeekOptions', () => {
  it('offers 1 to 7 without days', () => {
    expect(timesPerWeekOptions(gym)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('never offers fewer sessions than chosen days', () => {
    const draft = toggleDay(toggleDay(toggleDay(gym, 'SU'), 'TU'), 'TH');
    expect(timesPerWeekOptions(draft)).toEqual([3, 4, 5, 6, 7]);
  });
});

describe('canSave', () => {
  it('needs a workout type', () => {
    expect(canSave(NEW_ROUTINE)).toBe(false);
    expect(canSave(gym)).toBe(true);
  });

  it('rejects more days than sessions', () => {
    expect(
      canSave({
        ...gym,
        timesPerWeek: 1,
        days: [
          { weekday: 'SU', name: '' },
          { weekday: 'MO', name: '' },
        ],
      }),
    ).toBe(false);
  });
});

describe('draftOf', () => {
  it('reads a saved routine in week order, with blank names for unnamed days', () => {
    expect(
      draftOf({
        activity_id: 'gym',
        times_per_week: 3,
        routine_days: [
          { weekday: 'TH', name: null },
          { weekday: 'MO', name: 'Leg day' },
        ],
      }),
    ).toEqual({
      activityId: 'gym',
      timesPerWeek: 3,
      days: [
        { weekday: 'MO', name: 'Leg day' },
        { weekday: 'TH', name: '' },
      ],
    });
  });
});
