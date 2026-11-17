import React, { forwardRef, useSyncExternalStore } from 'react';
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  TextProps,
  TextInputProps,
} from 'react-native';
import { getAppLanguage, subscribeLanguage, translate } from './language';
export const useAppLanguage = () =>
  useSyncExternalStore(subscribeLanguage, getAppLanguage, getAppLanguage);
function content(children: React.ReactNode): React.ReactNode {
  if (typeof children === 'string') return translate(children);
  if (Array.isArray(children)) {
    if (
      children.every(
        child =>
          child == null ||
          ['string', 'number', 'boolean'].includes(typeof child),
      )
    )
      return translate(
        children
          .filter(child => child != null && typeof child !== 'boolean')
          .join(''),
      );
    return children.map(content);
  }
  return children;
}
export type Text = NativeText;
export type TextInput = NativeTextInput;
export const Text = forwardRef<NativeText, TextProps>((props, ref) => {
  useAppLanguage();
  return (
    <NativeText
      {...props}
      ref={ref}
      accessibilityLabel={
        props.accessibilityLabel
          ? translate(props.accessibilityLabel)
          : undefined
      }
    >
      {content(props.children)}
    </NativeText>
  );
});
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(
  (props, ref) => {
    useAppLanguage();
    return (
      <NativeTextInput
        {...props}
        ref={ref}
        placeholder={
          props.placeholder ? translate(props.placeholder) : undefined
        }
        accessibilityLabel={
          props.accessibilityLabel
            ? translate(props.accessibilityLabel)
            : undefined
        }
      />
    );
  },
);

import {
  TouchableOpacity as NativeTouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
export type TouchableOpacity = React.ComponentRef<
  typeof NativeTouchableOpacity
>;
export const TouchableOpacity = forwardRef<
  TouchableOpacity,
  TouchableOpacityProps
>((props, ref) => {
  useAppLanguage();
  return (
    <NativeTouchableOpacity
      {...props}
      ref={ref}
      accessibilityLabel={
        props.accessibilityLabel
          ? translate(props.accessibilityLabel)
          : undefined
      }
      accessibilityHint={
        props.accessibilityHint ? translate(props.accessibilityHint) : undefined
      }
    />
  );
});
