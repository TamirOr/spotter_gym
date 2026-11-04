import AsyncStorage from '@react-native-async-storage/async-storage';

// The code typed before Google sign-in, kept across the sign-in redirect.
const KEY = 'pending-invite-code';

export const pendingInvite = {
  get: () => AsyncStorage.getItem(KEY),
  set: (code: string) => AsyncStorage.setItem(KEY, code),
  clear: () => AsyncStorage.removeItem(KEY),
};
