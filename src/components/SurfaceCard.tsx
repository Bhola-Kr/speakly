import React, { PropsWithChildren } from 'react';
import {
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';

import Colors from '../constants/colors';
import UI from '../constants/ui';

type Props = PropsWithChildren<ViewProps & { style?: StyleProp<ViewStyle> }>;

const SurfaceCard = ({ children, style, ...props }: Props) => (
  <View {...props} style={[styles.card, style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: UI.radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    ...UI.shadow.card,
  },
});

export default SurfaceCard;
