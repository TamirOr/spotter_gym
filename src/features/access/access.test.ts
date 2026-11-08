import { accessOf } from './access';

describe('accessOf', () => {
  it('lets approved, active users in', () => {
    expect(accessOf({ approval: 'approved', active: true })).toBe('member');
  });

  it('keeps waiting and rejected users out', () => {
    expect(accessOf({ approval: 'pending', active: true })).toBe('pending');
    expect(accessOf({ approval: 'rejected', active: true })).toBe('rejected');
  });

  it('puts deactivation first', () => {
    expect(accessOf({ approval: 'approved', active: false })).toBe('inactive');
    expect(accessOf({ approval: 'pending', active: false })).toBe('inactive');
  });
});
