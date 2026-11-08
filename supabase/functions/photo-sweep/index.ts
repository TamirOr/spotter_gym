// Deletes one-time Going photos that everyone has seen, that expired, or whose workout was cancelled,
// plus uploads that were never attached. pg_cron calls it every 10 minutes with the shared secret of the
// scheduled functions (see the going photos migration). Postgres may not delete storage files itself,
// so this goes through the Storage API. Logs and responses carry counts only.

import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'going-photos';

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

Deno.serve(async (request) => {
  if (request.headers.get('Authorization') !== `Bearer ${requireEnv('PUSH_DISPATCH_SECRET')}`) {
    return new Response('Forbidden', { status: 403 });
  }

  const db = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

  const { data: due, error } = await db.rpc('going_photos_to_remove');
  if (error) throw error;
  const paths = [...new Set(due as string[])];

  if (paths.length > 0) {
    // Removing a file that is already gone is not an error, so a retried run is harmless.
    const removed = await db.storage.from(BUCKET).remove(paths);
    if (removed.error) throw removed.error;
    // Confirmed only after the files are gone, so a failed run is retried next time.
    const marked = await db.rpc('mark_going_photos_removed', { p_paths: paths });
    if (marked.error) throw marked.error;
  }

  const summary = { removed: paths.length };
  console.log(JSON.stringify(summary));
  return Response.json(summary);
});
