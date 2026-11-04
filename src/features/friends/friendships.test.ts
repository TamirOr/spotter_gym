import { groupFriendships, isSearchable, otherUser, type Friendship } from './friendships';

const row = (other: string, status: Friendship['status'], requestedBy: string): Friendship => ({
  user_low: 'a-me' < other ? 'a-me' : other,
  user_high: 'a-me' < other ? other : 'a-me',
  status,
  requested_by: requestedBy,
});

describe('groupFriendships', () => {
  it('sorts rows into friends, requests and blocks from my side', () => {
    expect(
      groupFriendships(
        [
          row('noa', 'accepted', 'noa'),
          row('yoav', 'pending', 'yoav'),
          row('maya', 'pending', 'a-me'),
          row('eitan', 'blocked', 'a-me'),
        ],
        'a-me',
      ),
    ).toEqual({ friends: ['noa'], incoming: ['yoav'], outgoing: ['maya'], blocked: ['eitan'] });
  });

  it('finds the other person in a sorted pair', () => {
    expect(otherUser(row('0-first', 'accepted', 'a-me'), 'a-me')).toBe('0-first');
    expect(otherUser(row('zed', 'accepted', 'a-me'), 'a-me')).toBe('zed');
  });
});

describe('isSearchable', () => {
  it('needs at least 2 characters', () => {
    expect(isSearchable(' n ')).toBe(false);
    expect(isSearchable('no')).toBe(true);
  });
});
