import { filterByActive, groupUsers, isHealthy, parseSupport, type AdminUser } from './users';

const user = (overrides: Partial<AdminUser>): AdminUser => ({
  id: 'id',
  full_name: '',
  email: 'x@example.com',
  avatar_url: null,
  is_admin: false,
  approval: 'approved',
  rejection_reason: null,
  active: true,
  created_at: '2026-11-01T10:00:00Z',
  approved_at: null,
  onboarded_at: null,
  last_sign_in_at: null,
  ...overrides,
});

describe('groupUsers', () => {
  it('splits users by approval and admin, waiting ones oldest first', () => {
    const groups = groupUsers([
      user({ id: 'late', approval: 'pending', created_at: '2026-11-03T00:00:00Z' }),
      user({ id: 'early', approval: 'pending', created_at: '2026-11-02T00:00:00Z' }),
      user({ id: 'no', approval: 'rejected' }),
      user({ id: 'yoav', full_name: 'Yoav' }),
      user({ id: 'noa', full_name: 'Noa' }),
      user({ id: 'dana', is_admin: true }),
    ]);
    expect(groups.pending.map((u) => u.id)).toEqual(['early', 'late']);
    expect(groups.rejected.map((u) => u.id)).toEqual(['no']);
    expect(groups.members.map((u) => u.id)).toEqual(['noa', 'yoav']);
    expect(groups.admins.map((u) => u.id)).toEqual(['dana']);
  });
});

describe('filterByActive', () => {
  const users = [user({ id: 'on' }), user({ id: 'off', active: false })];

  it('filters by active state', () => {
    expect(filterByActive(users, 'active').map((u) => u.id)).toEqual(['on']);
    expect(filterByActive(users, 'inactive').map((u) => u.id)).toEqual(['off']);
    expect(filterByActive(users, 'all')).toHaveLength(2);
  });
});

describe('isHealthy', () => {
  it('flags pushes stuck for ten minutes', () => {
    expect(isHealthy({ push_backlog: 3, oldest_push_minutes: 2, pending_signups: 0 })).toBe(true);
    expect(isHealthy({ push_backlog: 3, oldest_push_minutes: 10, pending_signups: 0 })).toBe(false);
  });
});

describe('parseSupport', () => {
  it('reads the support report and tolerates missing parts', () => {
    expect(parseSupport({ devices: [{ push_service: 'web.push.apple.com', updated_at: 't' }], friends: 2 })).toEqual({
      devices: [{ push_service: 'web.push.apple.com', updated_at: 't' }],
      notifications: [],
      friends: 2,
      cliques: 0,
    });
    expect(parseSupport(null).devices).toEqual([]);
  });
});
