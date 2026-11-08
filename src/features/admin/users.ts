import type { Json, Rpc } from '@/lib/database.types';

export type AdminUser = Rpc<'admin_users'>[number];
export type Health = Rpc<'admin_health'>[number];

export type UserGroups = {
  /** Oldest first, so nobody waits behind newer sign-ups. */
  pending: AdminUser[];
  rejected: AdminUser[];
  members: AdminUser[];
  admins: AdminUser[];
};

const byName = (a: AdminUser, b: AdminUser) => a.full_name.localeCompare(b.full_name) || a.email.localeCompare(b.email);

export function groupUsers(users: AdminUser[]): UserGroups {
  const approved = users.filter((user) => user.approval === 'approved');
  return {
    pending: users
      .filter((user) => user.approval === 'pending')
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    rejected: users.filter((user) => user.approval === 'rejected').sort(byName),
    members: approved.filter((user) => !user.is_admin).sort(byName),
    admins: approved.filter((user) => user.is_admin).sort(byName),
  };
}

export type ActiveFilter = 'active' | 'inactive' | 'all';
export const ACTIVE_FILTERS: ActiveFilter[] = ['active', 'inactive', 'all'];

export function filterByActive(users: AdminUser[], filter: ActiveFilter): AdminUser[] {
  return filter === 'all' ? users : users.filter((user) => user.active === (filter === 'active'));
}

/** Pushes go out every minute, so a due push older than this means the dispatcher is stuck. */
export const PUSH_LAG_LIMIT_MINUTES = 10;

export function isHealthy(health: Health): boolean {
  return health.oldest_push_minutes < PUSH_LAG_LIMIT_MINUTES;
}

export type Support = {
  devices: { push_service: string | null; updated_at: string }[];
  notifications: { kind: string; created_at: string; sent_at: string | null }[];
  friends: number;
  cliques: number;
};

/** The admin_user_support() result, with anything missing read as empty. */
export function parseSupport(value: Json): Support {
  const object = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const list = <T>(key: string) => (Array.isArray(object[key]) ? (object[key] as unknown as T[]) : []);
  const count = (key: string) => (typeof object[key] === 'number' ? (object[key] as number) : 0);
  return {
    devices: list<Support['devices'][number]>('devices'),
    notifications: list<Support['notifications'][number]>('notifications'),
    friends: count('friends'),
    cliques: count('cliques'),
  };
}
