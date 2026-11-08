import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, ErrorMessage, Screen, Text, TextField, colors, fonts, spacing } from '@/ui';

import { sendCode, verifyCode } from './api';
import { cleanCode, isCompleteCode, looksLikeEmail } from './signInCode';

/** Sign-in and sign-up in one: an email, then the 6-digit code sent to it. */
export function SignInScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [wrongCode, setWrongCode] = useState(false);

  async function requestCode() {
    setBusy(true);
    setError(null);
    setWrongCode(false);
    try {
      await sendCode(email);
      setStep('code');
    } catch (sendError) {
      setError(sendError);
    } finally {
      setBusy(false);
    }
  }

  // On success the session moves the app on to onboarding or Today.
  async function submitCode() {
    setBusy(true);
    setWrongCode(false);
    try {
      await verifyCode(email, code);
    } catch {
      setWrongCode(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      <Text style={styles.brand}>Spotter</Text>
      <Text variant="small">{t('signIn.tagline')}</Text>

      {step === 'email' ? (
        <>
          <TextField
            label={t('signIn.email')}
            value={email}
            onChangeText={setEmail}
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button label={t('signIn.sendCode')} disabled={!looksLikeEmail(email)} busy={busy} onPress={requestCode} />
        </>
      ) : (
        <>
          <Text variant="body" userContent>
            {t('signIn.codeSentTo', { email: email.trim() })}
          </Text>
          <TextField
            label={t('signIn.code')}
            value={code}
            onChangeText={(text) => setCode(cleanCode(text))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            style={styles.code}
          />
          <Button label={t('signIn.verify')} disabled={!isCompleteCode(code)} busy={busy} onPress={submitCode} />
          <View style={styles.row}>
            <Button label={t('signIn.changeEmail')} variant="quiet" onPress={() => setStep('email')} />
            <Button label={t('signIn.resend')} variant="quiet" disabled={busy} onPress={requestCode} />
          </View>
        </>
      )}
      {wrongCode ? (
        <Text variant="small" role="alert" style={styles.alert}>
          {t('signIn.invalidCode')}
        </Text>
      ) : null}
      <ErrorMessage error={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.xxl },
  brand: { fontFamily: fonts.bold, fontSize: 40, color: colors.ink },
  code: { fontFamily: fonts.bold, fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  alert: { color: colors.error },
});
