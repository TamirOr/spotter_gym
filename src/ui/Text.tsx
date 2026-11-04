import { StyleSheet, Text as NativeText, type TextProps } from 'react-native';

import { AUTO_DIRECTION } from './direction';
import { colors, fonts } from './theme';

const variants = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink },
  heading: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink },
  stat: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 24, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  strong: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  label: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  small: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  caption: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
});

export type TextVariant = keyof typeof variants;

type Props = TextProps & {
  variant?: TextVariant;
  /** Text people wrote sets its own direction from its content. */
  userContent?: boolean;
};

export function Text({ variant = 'body', userContent = false, style, ...props }: Props) {
  return <NativeText {...props} {...(userContent ? AUTO_DIRECTION : null)} style={[variants[variant], style]} />;
}
