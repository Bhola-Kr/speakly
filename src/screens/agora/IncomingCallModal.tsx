import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import InCallManager from 'react-native-incall-manager';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../../constants/colors';
import UI from '../../constants/ui';
import { copy } from '../../constants/strings';

interface Props {
  visible: boolean;
  avatar: string;
  userName: string;
  verified?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const IncomingCallModal = ({
  visible,
  userName,
  verified = true,
  onAccept,
  onDecline,
}: Props) => {
  const insets = useSafeAreaInsets();
  const bottomInsetStyle = useMemo(
    () => ({ paddingBottom: 34 + insets.bottom }),
    [insets.bottom],
  );
  const slideAnim = useRef(new Animated.Value(500)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    InCallManager.startRingtone('_DEFAULT_', 0, 'default', -1);

    return () => InCallManager.stopRingtone();
  }, [visible]);

  const handleAccept = () => {
    InCallManager.stopRingtone();
    onAccept();
  };

  const handleDecline = () => {
    InCallManager.stopRingtone();
    onDecline();
  };

  useEffect(() => {
    if (visible) {
      const callAnimation = Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 14,
          bounciness: 8,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.05,
              duration: 700,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 700,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          ]),
        ),
      ]);

      callAnimation.start();

      return () => callAnimation.stop();
    } else {
      slideAnim.setValue(500);
      pulseAnim.setValue(1);
    }
  }, [pulseAnim, slideAnim, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            bottomInsetStyle,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.handle} />

          <Text style={styles.title}>{copy.call.incoming}</Text>

          <Text style={styles.subtitle}>Someone wants to connect with you</Text>

          <Animated.View
            style={[
              styles.avatarContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={Colors.gradient}
              style={styles.avatarBorder}
            >
              <Image
                resizeMode={'contain'}
                source={require('../../assets/man.png')}
                style={styles.avatar}
              />
            </LinearGradient>
          </Animated.View>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{userName}</Text>

            {verified && (
              <MaterialCommunityIcons
                name="check-decagram"
                size={20}
                color={Colors.success}
                style={styles.verifiedIcon}
              />
            )}
          </View>

          {/* <Text style={styles.location}>
            {age} 
          </Text> */}

          <View style={styles.noticeBox}>
            <MaterialCommunityIcons
              name="shield-check"
              size={22}
              color={Colors.success}
            />

            <Text style={styles.noticeText}>
              Stay safe. Never share personal or financial information during
              calls.
            </Text>
          </View>

          <View style={styles.callButtonContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.declineButton}
              onPress={handleDecline}
            >
              <MaterialCommunityIcons
                name="phone-hangup"
                size={34}
                color={Colors.white}
              />
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.9} onPress={handleAccept}>
              <LinearGradient
                colors={Colors.gradient}
                style={styles.acceptButton}
              >
                <MaterialCommunityIcons
                  name="phone"
                  size={34}
                  color={Colors.white}
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonLabelRow}>
            <Text style={styles.buttonLabel}>{copy.common.decline}</Text>

            <Text style={styles.buttonLabel}>{copy.common.accept}</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlayBlack45,
  },

  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 18,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.border,
    ...UI.shadow.modal,
  },

  handle: {
    width: 60,
    height: 5,
    borderRadius: 10,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },

  title: {
    fontSize: UI.typography.screenTitle,
    lineHeight: 34,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    color: Colors.subText,
    fontSize: 15,
    lineHeight: 21,
  },

  avatarContainer: {
    marginTop: 30,
    alignSelf: 'center',
  },

  avatarBorder: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },

  avatar: {
    width: 140,
    height: 140,
    flex: 1,
    borderRadius: 66,
    backgroundColor: Colors.surface,
  },

  nameRow: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  name: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },

  verifiedIcon: {
    marginLeft: 6,
  },

  location: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 16,
    color: Colors.subText,
  },

  noticeBox: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  noticeText: {
    flex: 1,
    marginLeft: 12,
    color: Colors.subText,
    fontSize: 14,
    lineHeight: 20,
  },

  optionCard: {
    marginTop: 24,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
  },

  optionRow: {
    height: 56,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  optionText: {
    marginLeft: 14,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },

  callButtonContainer: {
    marginTop: 32,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },

  declineButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },

  acceptButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },

  buttonLabelRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },

  buttonLabel: {
    width: 84,
    textAlign: 'center',
    color: Colors.subText,
    fontWeight: '600',
    fontSize: 15,
  },
});

export default IncomingCallModal;
