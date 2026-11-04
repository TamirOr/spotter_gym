import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { signInWithGoogle } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { isStandalone } from '@/features/push/webPush';
import { Button, ErrorMessage, Screen, Text, TextField, colors, fonts, radii, spacing } from '@/ui';

import { useRedeemInvite } from './api';
import { codeFromParam, isWellFormedInviteCode } from './inviteCode';
import { pendingInvite } from './pendingInvite';

const INSTALL_STEPS = ['safari', 'share', 'add', 'open'] as const;

function InstallSteps({ code }: { code: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Text variant="strong" role="heading">
        {t('welcome.installTitle')}
      </Text>
      {INSTALL_STEPS.map((step, index) => (
        <Text key={step} variant="body">
          {`${index + 1}. ${t(`welcome.installSteps.${step}`)}`}
        </Text>
      ))}
      {code ? <Text style={styles.code}>{t('welcome.yourCode', { code })}</Text> : null}
    </View>
  );
}

/**
 * First run. The invite link opens here in Safari with the install steps and the code. The installed app
 * does not share storage with Safari, so the user types the code again, then signs in with Google.
 */
export function WelcomeScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(codeFromParam(params.code));
  const redeem = useRedeemInvite();
  const { mutate: redeemCode } = redeem;
  const [signInError, setSignInError] = useState<unknown>(null);

  // Back from Google with a code typed before the redirect: join straight away.
  useEffect(() => {
    if (!session) return;
    void pendingInvite.get().then((pending) => {
      if (pending) redeemCode(pending);
    });
  }, [session, redeemCode]);

  async function continueWithGoogle() {
    await pendingInvite.set(code);
    await signInWithGoogle().catch(setSignInError);
  }

  return (
    <Screen contentStyle={styles.content}>
      <Text style={styles.brand}>Spotter</Text>
      <Text variant="small">{t('welcome.tagline')}</Text>

      {isStandalone() ? null : <InstallSteps code={code} />}

      <TextField
        label={t('welcome.codeLabel')}
        placeholder={t('welcome.codePlaceholder')}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
      />
      {session ? (
        <Button
          label={redeem.isPending ? t('welcome.joining') : t('common.continue')}
          disabled={!isWellFormedInviteCode(code)}
          busy={redeem.isPending}
          onPress={() => redeem.mutate(code)}
        />
      ) : (
        <Button label={t('welcome.signIn')} disabled={!isWellFormedInviteCode(code)} onPress={continueWithGoogle} />
      )}
      <ErrorMessage error={redeem.error ?? signInError} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.xxl },
  brand: { fontFamily: fonts.bold, fontSize: 40, color: colors.ink },
  card: { gap: spacing.sm, padding: spacing.lg, borderRadius: radii.md, backgroundColor: colors.surface },
  code: { fontFamily: fonts.bold, fontSize: 20, marginTop: spacing.sm },
});
