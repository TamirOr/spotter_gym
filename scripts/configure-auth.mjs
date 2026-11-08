// Sets up email-code sign-in on the hosted Supabase project through its Management API, so it needs no
// dashboard work or local terminal. Safe to run again.
//
// Environment: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF, and the optional SITE_URL and
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SENDER.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const API = 'https://api.supabase.com/v1';
const EMAIL = /^[^\s@"'<>]+@[^\s@"'<>]+\.[^\s@"'<>]+$/;

/**
 * SMTP settings from the SMTP_* secrets, or null when SMTP_HOST is not set. A missing secret reaches the
 * workflow as an empty string and pasted values can carry spaces, so values are trimmed and checked here
 * with a message that names the secret to fix.
 */
export function smtpFromEnv(env) {
  const value = (name) => (env[name] ?? '').trim();
  const host = value('SMTP_HOST');
  if (!host) return null;
  const user = value('SMTP_USER');
  // App passwords are shown in groups of four with spaces; none belong in it.
  const pass = value('SMTP_PASS').replace(/\s+/g, '');
  const sender = value('SMTP_SENDER') || user;
  if (!user || !pass) throw new Error('SMTP_HOST is set, but SMTP_USER or SMTP_PASS is empty');
  if (!EMAIL.test(sender)) {
    throw new Error('SMTP_SENDER must be a plain email address such as name@gmail.com (no spaces, quotes or name)');
  }
  return { host, port: value('SMTP_PORT') || '587', user, pass, sender };
}

/**
 * Auth settings for email-code sign-in and sign-up. A code, not a magic link, because a link opens in
 * Safari and would not sign in the app installed on the Home Screen. The code needs our email template,
 * and the free plan allows custom templates only with a custom SMTP sender; without one, emails keep
 * Supabase's default template, which carries a link instead of the code.
 */
export function authSettings({ siteUrl = '', otpTemplate, smtp = null }) {
  const settings = {
    external_email_enabled: true,
    disable_signup: false,
    mailer_autoconfirm: true,
    mailer_otp_length: 6,
    mailer_otp_exp: 600,
    // Per IP, per 5 minutes: generous for a few friends, low enough to stop guessing.
    rate_limit_otp: 30,
    rate_limit_verify: 30,
  };
  if (siteUrl) Object.assign(settings, { site_url: siteUrl, uri_allow_list: siteUrl });
  if (smtp) {
    Object.assign(settings, {
      rate_limit_email_sent: 60,
      mailer_subjects_magic_link: 'קוד הכניסה שלך ל-Spotter',
      mailer_templates_magic_link_content: otpTemplate,
      mailer_subjects_confirmation: 'קוד הכניסה שלך ל-Spotter',
      mailer_templates_confirmation_content: otpTemplate,
      smtp_host: smtp.host,
      smtp_port: smtp.port,
      smtp_user: smtp.user,
      smtp_pass: smtp.pass,
      smtp_admin_email: smtp.sender,
      smtp_sender_name: 'Spotter',
    });
  }
  return settings;
}

async function configureAuth(env) {
  const { SUPABASE_ACCESS_TOKEN: token, SUPABASE_PROJECT_REF: ref } = env;
  if (!token || !ref) throw new Error('SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are required');
  const otpTemplate = await readFile(new URL('../supabase/templates/otp.html', import.meta.url), 'utf8');
  const smtp = smtpFromEnv(env);
  const response = await fetch(`${API}/projects/${ref}/config/auth`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(authSettings({ siteUrl: (env.SITE_URL ?? '').trim(), otpTemplate, smtp })),
  });
  // The response body can echo settings, so only the status reaches the public log.
  if (!response.ok) throw new Error(`Updating auth settings failed: HTTP ${response.status}`);
  console.log(
    smtp ? 'Email-code sign-in configured' : 'Sign-in configured; add the SMTP_* secrets so emails carry the code',
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  configureAuth(process.env).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
