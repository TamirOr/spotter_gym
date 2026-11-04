import type { Language } from '@/i18n';
import type { Tables } from '@/lib/database.types';

export type Activity = Pick<Tables<'activities'>, 'id' | 'owner_id' | 'name' | 'name_he' | 'aliases'>;

/** Presets have a name in each language; custom activities keep the name their creator typed. */
export function activityLabel(activity: Pick<Activity, 'name' | 'name_he'>, language: Language): string {
  return language === 'he' ? (activity.name_he ?? activity.name) : activity.name;
}

/**
 * Mirrors public.normalize_name so the picker can filter as the user types. The server's version decides
 * what counts as the same activity.
 */
export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[֑-ׇֽֿׁׂׅׄ]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[ךםןףץ]/g, (letter) => ({ ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' })[letter]!);
}

function matches(activity: Activity, query: string): boolean {
  const candidates = [activity.name, activity.name_he ?? '', ...activity.aliases].map(normalizeName);
  return candidates.some((candidate) => candidate.includes(query));
}

/**
 * The picker list: the user's most-used activities first, then presets, then the rest by name.
 * Typing filters by name, Hebrew name and alias.
 */
export function pickerOptions(
  activities: Activity[],
  usage: ReadonlyMap<string, number>,
  query: string,
  language: Language,
): Activity[] {
  const normalizedQuery = normalizeName(query);
  const uses = (activity: Activity) => usage.get(activity.id) ?? 0;
  return activities
    .filter((activity) => !normalizedQuery || matches(activity, normalizedQuery))
    .sort(
      (a, b) =>
        uses(b) - uses(a) ||
        Number(a.owner_id !== null) - Number(b.owner_id !== null) ||
        activityLabel(a, language).localeCompare(activityLabel(b, language), language),
    );
}

export function hasExactMatch(activities: Activity[], query: string): boolean {
  const normalizedQuery = normalizeName(query);
  return activities.some((activity) =>
    [activity.name, activity.name_he ?? '', ...activity.aliases].some(
      (name) => normalizeName(name) === normalizedQuery,
    ),
  );
}

export function countUsage(activityIds: string[]): Map<string, number> {
  const usage = new Map<string, number>();
  for (const id of activityIds) usage.set(id, (usage.get(id) ?? 0) + 1);
  return usage;
}
