import { distinctViewers, unmarkedIds, viewCount, type SeenView } from './seen';

const view = (checkin_id: string, name: string, seen_at: string): SeenView => ({
  checkin_id,
  viewer_id: name.toLowerCase(),
  seen_at,
  viewer: { full_name: name, avatar_url: null },
});

describe('unmarkedIds', () => {
  it('sends each visible check-in once', () => {
    expect(unmarkedIds(['a', null, 'b', 'a', 'c'], new Set(['b']))).toEqual(['a', 'c']);
  });
});

describe('viewCount', () => {
  it('counts the people who saw one check-in', () => {
    const views = [view('going', 'Yoav', '1'), view('going', 'Dana', '2'), view('done', 'Yoav', '3')];
    expect(viewCount(views, 'going')).toBe(2);
    expect(viewCount(views, 'other')).toBe(0);
  });
});

describe('distinctViewers', () => {
  it('lists each viewer once, latest first', () => {
    const views = [
      view('going', 'Yoav', '2026-11-08T10:00:00Z'),
      view('done', 'Dana', '2026-11-08T11:00:00Z'),
      view('done', 'Yoav', '2026-11-08T12:00:00Z'),
    ];
    expect(distinctViewers(views).map((viewer) => viewer.full_name)).toEqual(['Yoav', 'Dana']);
  });

  it('tells apart two people with the same name', () => {
    const views = [view('a', 'Noa', '1'), { ...view('a', 'Noa', '2'), viewer_id: 'other-noa' }];
    expect(distinctViewers(views)).toHaveLength(2);
  });

  it('skips a viewer the athlete can no longer see', () => {
    expect(distinctViewers([{ checkin_id: 'a', viewer_id: 'x', seen_at: '1', viewer: null }])).toEqual([]);
  });
});
