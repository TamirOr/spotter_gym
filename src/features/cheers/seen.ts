// "Seen" receipts: the athlete sees who has seen a check-in, so a quiet moment does not feel like being
// ignored. Viewers record what was on their screen; the server keeps only what they may see.

export type SeenView = {
  checkin_id: string;
  viewer_id: string;
  seen_at: string;
  /** Null when the athlete can no longer see the viewer, after they left the clique. */
  viewer: { full_name: string; avatar_url: string | null } | null;
};

/** Ids not yet sent from this device, so each check-in is recorded once per session. */
export function unmarkedIds(ids: (string | null)[], marked: ReadonlySet<string>): string[] {
  return [...new Set(ids.filter((id): id is string => !!id && !marked.has(id)))];
}

/** How many people saw one check-in. */
export function viewCount(views: SeenView[], checkinId: string): number {
  return views.filter((view) => view.checkin_id === checkinId).length;
}

export type Viewer = NonNullable<SeenView['viewer']> & { id: string };

/** Everyone who saw any of today's check-ins, once each, latest first. */
export function distinctViewers(views: SeenView[]): Viewer[] {
  const latestFirst = [...views].sort((a, b) => b.seen_at.localeCompare(a.seen_at));
  const viewers = new Map<string, Viewer>();
  for (const view of latestFirst) {
    if (view.viewer && !viewers.has(view.viewer_id)) {
      viewers.set(view.viewer_id, { id: view.viewer_id, ...view.viewer });
    }
  }
  return [...viewers.values()];
}
