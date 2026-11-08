import assert from 'node:assert/strict';
import { test } from 'node:test';

import { authSettings, smtpFromEnv } from './configure-auth.mjs';

test('sign-in always uses a 6-digit code that lasts 10 minutes', () => {
  const settings = authSettings({ otpTemplate: '{{ .Token }}' });
  assert.equal(settings.mailer_otp_length, 6);
  assert.equal(settings.mailer_otp_exp, 600);
  assert.equal(settings.disable_signup, false);
});

test('without SMTP, the email template and sender are left alone', () => {
  const settings = authSettings({ otpTemplate: '{{ .Token }}' });
  assert.equal(settings.mailer_templates_magic_link_content, undefined);
  assert.equal(settings.smtp_host, undefined);
});

test('with SMTP, both sign-in and sign-up emails carry the code', () => {
  const smtp = { host: 'smtp.gmail.com', port: '587', user: 'a@gmail.com', pass: 'p', sender: 'a@gmail.com' };
  const settings = authSettings({ otpTemplate: '{{ .Token }}', smtp });
  assert.equal(settings.mailer_templates_magic_link_content, '{{ .Token }}');
  assert.equal(settings.mailer_templates_confirmation_content, '{{ .Token }}');
  assert.equal(settings.smtp_admin_email, 'a@gmail.com');
});

test('the site URL is set only once it is known', () => {
  assert.equal(authSettings({ otpTemplate: '' }).site_url, undefined);
  assert.equal(
    authSettings({ otpTemplate: '', siteUrl: 'https://spotter.expo.app' }).site_url,
    'https://spotter.expo.app',
  );
});

test('SMTP secrets are tidied and checked', () => {
  assert.equal(smtpFromEnv({}), null);
  assert.deepEqual(
    smtpFromEnv({ SMTP_HOST: ' smtp.gmail.com ', SMTP_USER: 'a@gmail.com', SMTP_PASS: 'abcd efgh ijkl mnop' }),
    { host: 'smtp.gmail.com', port: '587', user: 'a@gmail.com', pass: 'abcdefghijklmnop', sender: 'a@gmail.com' },
  );
  assert.throws(() => smtpFromEnv({ SMTP_HOST: 'smtp.gmail.com', SMTP_USER: 'a@gmail.com' }), /SMTP_PASS/);
  assert.throws(
    () =>
      smtpFromEnv({ SMTP_HOST: 'h', SMTP_USER: 'a@gmail.com', SMTP_PASS: 'p', SMTP_SENDER: 'Spotter <a@gmail.com>' }),
    /SMTP_SENDER/,
  );
});
