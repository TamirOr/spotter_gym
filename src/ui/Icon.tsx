import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from './theme';

// Stroke icons from the mockups. Decorative: the control that holds one carries the label.
const paths = {
  chevronDown: <Path d="m6 9 6 6 6-6" />,
  chevronForward: <Path d="m15 6-6 6 6 6" />,
  close: <Path d="M6 6l12 12M18 6 6 18" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  check: <Path d="m5 12 5 5 9-10" />,
  today: (
    <>
      <Circle cx={12} cy={12} r={4} />
      <Path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </>
  ),
  clique: (
    <>
      <Circle cx={9} cy={8} r={3.5} />
      <Path d="M2.5 20c.6-3.6 3.2-6 6.5-6s5.9 2.4 6.5 6" />
      <Path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.4c1.9.8 3.1 2.8 3.5 5.6" />
    </>
  ),
  me: (
    <>
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4.5 21c.7-4 3.7-6.5 7.5-6.5s6.8 2.5 7.5 6.5" />
    </>
  ),
};

export type IconName = keyof typeof paths;

type Props = { name: IconName; size?: number; color?: ColorValue; strokeWidth?: number; style?: StyleProp<ViewStyle> };

export function Icon({ name, size = 24, color = colors.ink, strokeWidth = 2, style }: Props) {
  return (
    <Svg
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </Svg>
  );
}
