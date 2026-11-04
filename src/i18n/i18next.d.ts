import 'i18next';

import type { he } from './he';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof he };
    returnNull: false;
  }
}
