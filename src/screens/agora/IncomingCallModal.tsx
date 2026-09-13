import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../constants/colors';

interface Props {
  visible: boolean;
  avatar: string;
  userName: string;
  verified?: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onBlock?: () => void;
  onReport?: (reason: string) => void;
}

const IncomingCallModal = ({
  visible,
  userName,
  verified = true,
  onAccept,
  onDecline,
  onBlock,
  onReport,
}: Props) => {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // InCallManager.startRingtone('', 0, 'default', 30);
      Animated.parallel([
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
      ]).start();
    } else {
      slideAnim.setValue(500);
      pulseAnim.setValue(1);
    }
  }, [pulseAnim, slideAnim, visible]);

  if (!visible) {
    return null;
  }

  const showBlockAlert = () => {
    Alert.alert(
      'Block User',
      `Block ${userName}? You won't receive calls from this user again.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => onBlock?.(),
        },
      ],
    );
  };

  const showReportAlert = () => {
    Alert.alert('Report User', 'Do you want to report this user?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Report',
        style: 'destructive',
        onPress: () => onReport?.('Report'),
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <Pressable style={styles.overlay} onPress={onDecline}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.handle} />

          <Text style={styles.title}>Incoming Voice Call</Text>

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
              colors={Colors.goldGradient}
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
                style={{ marginLeft: 6 }}
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

          <View style={styles.optionCard}>
            <TouchableOpacity
              style={styles.optionRow}
              activeOpacity={0.8}
              onPress={showBlockAlert}
            >
              <MaterialCommunityIcons
                name="block-helper"
                size={22}
                color={Colors.danger}
              />

              <Text style={styles.optionText}>Block User</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.optionRow}
              activeOpacity={0.8}
              onPress={showReportAlert}
            >
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={22}
                color={Colors.warning}
              />

              <Text style={styles.optionText}>Report User</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.callButtonContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.declineButton}
              onPress={onDecline}
            >
              <MaterialCommunityIcons
                name="phone-hangup"
                size={34}
                color={Colors.white}
              />
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.9} onPress={onAccept}>
              <LinearGradient
                colors={Colors.goldGradient}
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
            <Text style={styles.buttonLabel}>Decline</Text>

            <Text style={styles.buttonLabel}>Accept</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  container: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 34,
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
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    color: Colors.subText,
    fontSize: 15,
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
