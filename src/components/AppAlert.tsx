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
import LinearGradient from 'react-native-linear-gradient';

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
  if (message && /permission[-_ ]denied/i.test(message))
    message = 'Is action ka access nahi mila.';
  else if (
    message &&
    /network[-_ ](?:request[-_ ])?(?:failed|error)/i.test(message)
  )
    message = 'Internet check karo aur dobara try karo.';
  else if (message && /^\[(auth|database|storage)\//.test(message))
    message = 'Request poori nahi hui. Dobara try karo.';
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
        <View
          style={styles.card}
          accessibilityRole="alert"
          accessibilityViewIsModal
        >
          <LinearGradient
            colors={
              destructive
                ? [Colors.errorSurface, Colors.white]
                : [Colors.primaryLight, Colors.surfaceSecondary, Colors.white]
            }
            style={styles.hero}
          >
            <View style={[styles.icon, destructive && styles.dangerIcon]}>
              <MaterialCommunityIcons
                name={destructive ? 'alert-outline' : 'information-outline'}
                size={32}
                color={destructive ? Colors.danger : Colors.primary}
              />
            </View>
          </LinearGradient>
          <Text style={styles.title}>{request?.title}</Text>
          {Boolean(request?.message) && (
            <Text style={styles.message}>{request?.message}</Text>
          )}
          <View style={styles.actions}>
            {request?.buttons.map((button, index) => {
              const isDestructive = button.style === 'destructive';
              const primary =
                isDestructive ||
                (request.buttons.length === 1 && button.style !== 'cancel');
              const buttonLabel = button.text || 'OK';
              return (
                <TouchableOpacity
                  key={`${buttonLabel}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={buttonLabel}
                  activeOpacity={0.88}
                  style={[
                    styles.button,
                    primary ? styles.primaryButton : styles.secondaryButton,
                    isDestructive && styles.dangerButton,
                  ]}
                  onPress={() => {
                    close();
                    button.onPress?.();
                  }}
                >
                  {primary && (
                    <LinearGradient
                      colors={
                        isDestructive
                          ? [Colors.danger, '#B91C1C']
                          : Colors.buttonGradient
                      }
                      style={styles.primaryButtonContent}
                    >
                      <Text style={styles.primaryButtonText}>
                        {buttonLabel}
                      </Text>
                      <MaterialCommunityIcons
                        name={
                          isDestructive ? 'alert-circle-outline' : 'arrow-right'
                        }
                        size={19}
                        color={Colors.white}
                      />
                    </LinearGradient>
                  )}
                  {!primary && (
                    <Text style={styles.secondaryButtonText}>
                      {buttonLabel}
                    </Text>
                  )}
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
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: UI.spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    padding: UI.spacing.xl,
    paddingTop: 14,
    alignItems: 'center',
    ...UI.shadow.modal,
  },
  icon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...UI.shadow.card,
  },
  hero: {
    width: '100%',
    height: 132,
    marginBottom: UI.spacing.sm,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerIcon: {
    backgroundColor: Colors.white,
    borderColor: Colors.errorSurface,
  },
  title: {
    marginTop: UI.spacing.lg,
    color: Colors.text,
    fontSize: UI.typography.screenTitle,
    lineHeight: 33,
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
  actions: { width: '100%', marginTop: UI.spacing.xl, gap: UI.spacing.sm },
  button: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'stretch',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  primaryButton: { ...UI.shadow.card },
  dangerButton: {},
  primaryButtonContent: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: UI.spacing.sm,
    paddingHorizontal: UI.spacing.lg,
  },
  secondaryButton: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    paddingHorizontal: UI.spacing.lg,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: UI.typography.body,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  secondaryButtonText: {
    color: Colors.text,
    fontSize: UI.typography.body,
    fontWeight: '700',
  },
});

export default AppAlert;
