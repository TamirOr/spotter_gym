# Setup

Everything here runs on free plans with no payment method on any account. Hitting a limit then stops a
service instead of creating a bill.

## 1. Supabase

1. Create a free project. Note the project ref, URL and publishable key (Project Settings → API).
2. Link and push the schema:

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```

3. Store the values the scheduled push job needs in Vault (SQL editor). The secret is any long random string:

   ```sql
   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
   select vault.create_secret('<random secret>', 'push_dispatch_secret');
   ```

## 2. Google sign-in

1. In Google Cloud, create an OAuth client of type _Web application_. Add
   `https://<ref>.supabase.co/auth/v1/callback` as an authorized redirect URI.
2. In Supabase, Authentication → Providers → Google: paste the client id and secret.
3. Authentication → URL Configuration: set the site URL to the hosted app's address, and add it to the
   redirect allow list.

## 3. Web push

1. Generate VAPID keys: `npx web-push generate-vapid-keys`.
2. Set the Edge Function secrets and deploy it:

   ```bash
   npx supabase secrets set VAPID_PUBLIC_KEY=<public> VAPID_PRIVATE_KEY=<private> \
     VAPID_SUBJECT=mailto:<your address> PUSH_DISPATCH_SECRET=<same secret as in Vault>
   npx supabase functions deploy push-dispatch --no-verify-jwt
   ```

3. Put the public key in `EXPO_PUBLIC_VAPID_PUBLIC_KEY` for the web build.

Web push on iPhone needs iOS 16.4+ and the app opened from the Home Screen.

## 4. Hosting and GitHub

Create a free Expo account and an access token. In the GitHub repository, add an environment called
`production` with:

| Kind     | Name                                   | Value                                                              |
| -------- | -------------------------------------- | ------------------------------------------------------------------ |
| Variable | `EXPO_PUBLIC_SUPABASE_URL`             | project URL                                                        |
| Variable | `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key                                                    |
| Variable | `EXPO_PUBLIC_VAPID_PUBLIC_KEY`         | VAPID public key                                                   |
| Variable | `BACKUP_REPOSITORY`                    | `owner/name` of a **private** repository for backups               |
| Secret   | `SUPABASE_ACCESS_TOKEN`                | Supabase personal access token                                     |
| Secret   | `SUPABASE_DB_PASSWORD`                 | database password                                                  |
| Secret   | `SUPABASE_DB_URL`                      | session pooler connection string                                   |
| Secret   | `EXPO_TOKEN`                           | Expo access token                                                  |
| Secret   | `BACKUP_TOKEN`                         | fine-grained token with write access to the backup repository only |

Pushing to `main` deploys the database, the Edge Function and then the web app. Every 3 days a scheduled job
touches the API, so the free project does not pause, and stores a dump in the backup repository.

## 5. The first invite

Sign-up is invite-only. Bootstrap the first user once, from the SQL editor, after they sign in with Google:

```sql
update public.profiles set joined_at = now() where email = '<your google email>';
```

From then on, invite friends from the Clique tab.
