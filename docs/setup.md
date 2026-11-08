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

## 2. Email-code sign-in

Friends sign in and sign up the same way: they type their email and get a 6-digit code. The Database
workflow sets this up. For the email to carry the code, Supabase needs your own mail sender (the free
plan allows a custom email template only with one). Gmail is the simplest:

1. On a Gmail account with 2-Step Verification on, open https://myaccount.google.com/apppasswords and
   create an app password named `spotter`. Copy the 16 characters.
2. Add these GitHub secrets (Settings → Secrets and variables → Actions):

   | Secret        | Value             |
   | ------------- | ----------------- |
   | `SMTP_HOST`   | `smtp.gmail.com`  |
   | `SMTP_PORT`   | `587`             |
   | `SMTP_USER`   | the Gmail address |
   | `SMTP_PASS`   | the app password  |
   | `SMTP_SENDER` | the Gmail address |

3. Run Actions → Database → Run workflow.

Once the app has its address, add it as the GitHub variable `SITE_URL` and run the workflow again.

### First admin

New sign-ups wait until an admin approves them (people who signed up before approval existed stay in).
To make the first admin:

1. Sign in to the app once with the admin's email. The app shows the waiting screen; that is expected.
2. Run Actions → Database → Run workflow, and fill in **admin_email**. The address is masked in the log.
   (Or, in the SQL editor: `select public.promote_admin('you@example.com');`.)
3. Reopen the app. Me → Admin shows sign-ups to approve, people to add ahead of time, and every user.

Admins approve or decline sign-ups, add someone by email so they land in the app approved, deactivate
users (which also blocks their sign-in) and delete them. They see each user's account and support details
(devices and recent pushes), never their workouts, goals or plans. Admins are made only this way, and
cannot be deleted from the app.

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

Create a free Expo account and an access token. In the GitHub repository, add these under Settings →
Secrets and variables → Actions. The app's Supabase address and public key are read from the project,
so they need no setting.

| Kind     | Name                           | Value                                                              |
| -------- | ------------------------------ | ------------------------------------------------------------------ |
| Variable | `EXPO_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key                                                   |
| Variable | `SITE_URL`                     | the app's address, once deployed                                   |
| Variable | `BACKUP_REPOSITORY`            | `owner/name` of a **private** repository for backups               |
| Secret   | `SUPABASE_ACCESS_TOKEN`        | Supabase personal access token                                     |
| Secret   | `SUPABASE_DB_PASSWORD`         | database password                                                  |
| Secret   | `SUPABASE_DB_URL`              | session pooler connection string                                   |
| Secret   | `EXPO_TOKEN`                   | Expo access token                                                  |
| Secret   | `BACKUP_TOKEN`                 | fine-grained token with write access to the backup repository only |

Pushing to `main` deploys the database, the Edge Function and then the web app. Every 3 days a scheduled job
touches the API, so the free project does not pause, and stores a dump in the backup repository.
