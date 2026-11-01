import React from 'react';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

const NoFeedbackTabButton = (props: BottomTabBarButtonProps) => (
  <PlatformPressable
    {...props}
    android_ripple={{ borderless: true, color: 'transparent' }}
    pressColor="transparent"
    pressOpacity={1}
  />
);

export default NoFeedbackTabButton;
