import type { Tables } from '@/lib/database.types';

export type Friendship = Pick<Tables<'friendships'>, 'user_low' | 'user_high' | 'status' | 'requested_by'>;

export type FriendGroups = {
  friends: string[];
  /** Requests waiting for my answer. */
  incoming: string[];
  /** Requests I sent. */
  outgoing: string[];
  /** People I blocked. A block against me is never visible. */
  blocked: string[];
};

export function otherUser(friendship: Friendship, me: string): string {
  return friendship.user_low === me ? friendship.user_high : friendship.user_low;
}

export function groupFriendships(rows: Friendship[], me: string): FriendGroups {
  const groups: FriendGroups = { friends: [], incoming: [], outgoing: [], blocked: [] };
  for (const row of rows) {
    const other = otherUser(row, me);
    if (row.status === 'accepted') groups.friends.push(other);
    else if (row.status === 'blocked') groups.blocked.push(other);
    else if (row.requested_by === me) groups.outgoing.push(other);
    else groups.incoming.push(other);
  }
  return groups;
}

/** Name search needs at least 2 characters; an email is always longer. */
export function isSearchable(query: string): boolean {
  return query.trim().length >= 2;
}
