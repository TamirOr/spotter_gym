import {
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_600SemiBold,
  Heebo_700Bold,
  useFonts,
} from '@expo-google-fonts/heebo';
import { QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { AdminViewProvider } from '@/features/admin/AdminViewProvider';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RootNavigator } from '@/features/navigation/RootNavigator';
import { initI18n } from '@/i18n';
import { queryClient } from '@/lib/queryClient';
import { useLanguage } from '@/lib/useLanguage';
import { appDirection } from '@/ui';

initI18n();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Heebo_400Regular, Heebo_500Medium, Heebo_600SemiBold, Heebo_700Bold });
  const { language } = useLanguage();
  return (
    <View style={styles.root} {...appDirection(language)}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AdminViewProvider>{fontsLoaded ? <RootNavigator /> : null}</AdminViewProvider>
        </AuthProvider>
      </QueryClientProvider>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
