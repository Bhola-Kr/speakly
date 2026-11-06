import React, { useEffect, useState } from 'react';
import {
  Alert,
  AlertButton,
  AlertOptions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import Colors from '../constants/colors';
import UI from '../constants/ui';

type AlertRequest = {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
};

type Listener = (request: AlertRequest | null) => void;

let currentRequest: AlertRequest | null = null;
let nextId = 1;
const listeners = new Set<Listener>();

const publish = (request: AlertRequest | null) => {
  currentRequest = request;
  listeners.forEach(listener => listener(request));
};

const themedAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
) => {
  publish({
    id: nextId++,
    title,
    message,
    buttons: buttons?.length ? buttons : [{ text: 'OK' }],
    options,
  });
};

// Keep the familiar API for non-React services while routing every alert to
// the themed host below instead of the platform dialog.
Alert.alert = themedAlert;

const AppAlert = () => {
  const [request, setRequest] = useState<AlertRequest | null>(currentRequest);

  useEffect(() => {
    listeners.add(setRequest);
    return () => {
      listeners.delete(setRequest);
    };
  }, []);

  const close = () => publish(null);
  const dismiss = () => {
    if (request?.options?.cancelable === false) return;
    close();
    request?.options?.onDismiss?.();
  };
  const destructive = request?.buttons.some(
    button => button.style === 'destructive',
  );

  return (
    <Modal
      animationType="fade"
      transparent
      statusBarTranslucent
      visible={Boolean(request)}
      onRequestClose={dismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        <View style={styles.card} accessibilityRole="alert">
          <View
            style={[
              styles.icon,
              destructive ? styles.dangerIcon : styles.primaryIcon,
            ]}
          >
            <MaterialCommunityIcons
              name={destructive ? 'alert-outline' : 'information-outline'}
              size={UI.size.icon}
              color={destructive ? Colors.danger : Colors.secondary}
            />
          </View>
          <Text style={styles.title}>{request?.title}</Text>
          {Boolean(request?.message) && (
            <Text style={styles.message}>{request?.message}</Text>
          )}
          <View style={styles.actions}>
            {request?.buttons.map((button, index) => {
              const primary =
                button.style === 'destructive' ||
                (request.buttons.length === 1 && button.style !== 'cancel');
              return (
                <TouchableOpacity
                  key={`${button.text || 'OK'}-${index}`}
                  activeOpacity={0.82}
                  style={[
                    styles.button,
                    primary ? styles.primaryButton : styles.secondaryButton,
                    button.style === 'destructive' && styles.dangerButton,
                  ]}
                  onPress={() => {
                    close();
                    button.onPress?.();
                  }}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      primary
                        ? styles.primaryButtonText
                        : styles.secondaryButtonText,
                    ]}
                  >
                    {button.text || 'OK'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 14, 35, 0.62)',
    justifyContent: 'center',
    padding: UI.spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    borderRadius: UI.radius.alert,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    padding: UI.spacing.xl,
    ...UI.shadow.modal,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: UI.radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  primaryIcon: { backgroundColor: Colors.screenTint },
  dangerIcon: { backgroundColor: Colors.errorSurface },
  title: {
    marginTop: UI.spacing.lg,
    color: Colors.text,
    fontSize: UI.typography.screenTitle,
    lineHeight: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    marginTop: UI.spacing.sm,
    color: Colors.subText,
    fontSize: UI.typography.body,
    lineHeight: 22,
    textAlign: 'center',
  },
  actions: { marginTop: UI.spacing.xl, gap: UI.spacing.sm },
  button: {
    minHeight: 48,
    borderRadius: UI.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI.spacing.lg,
  },
  primaryButton: { backgroundColor: Colors.primary },
  dangerButton: { backgroundColor: Colors.danger },
  secondaryButton: { backgroundColor: Colors.surface },
  buttonText: { fontSize: UI.typography.body, fontWeight: '700' },
  primaryButtonText: { color: Colors.white },
  secondaryButtonText: { color: Colors.text },
});

export default AppAlert;
