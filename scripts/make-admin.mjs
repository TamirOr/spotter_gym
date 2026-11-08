// Makes ADMIN_EMAIL an admin of the hosted project, through the Management API's SQL endpoint. The person
// signs in to the app once first, so their account exists. Safe to run again.
//
// Environment: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF, ADMIN_EMAIL.
import { pathToFileURL } from 'node:url';

const API = 'https://api.supabase.com/v1';
const EMAIL = /^[^\s@"'<>]+@[^\s@"'<>]+\.[^\s@"'<>]+$/;

/** The SQL that promotes one address. The address is checked first and quoted as a literal. */
export function promoteAdminSql(email) {
  const address = (email ?? '').trim();
  if (!EMAIL.test(address)) throw new Error('ADMIN_EMAIL must be a plain email address');
  return `select public.promote_admin('${address.replaceAll("'", "''")}')`;
}

async function makeAdmin(env) {
  const { SUPABASE_ACCESS_TOKEN: token, SUPABASE_PROJECT_REF: ref } = env;
  if (!token || !ref) throw new Error('SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are required');
  const response = await fetch(`${API}/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: promoteAdminSql(env.ADMIN_EMAIL) }),
  });
  // Never the address or the response body: the run page is public.
  if (!response.ok) {
    throw new Error(`Making the admin failed: HTTP ${response.status}. Has this person signed in to the app once?`);
  }
  console.log('Admin promoted');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  makeAdmin(process.env).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
