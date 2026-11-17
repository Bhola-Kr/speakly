import { TouchableOpacity } from '../localization/components';
import { Text } from '../localization/components';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Alert,
  Easing,
  Image,
  NativeModules,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { getUserAvatar } from '../constants/constants';
import RoomService from '../firebase/RoomService';
import { useActiveCall } from '../hooks/ActiveCallContext';
import { useUser } from '../hooks/UserContext';
import {
  DEFAULT_MIN_EXPERT_WITHDRAWAL_AMOUNT,
  listenMinimumWithdrawalAmount,
  requestExpertWithdrawal,
} from '../firebase/expertEarnings';
import Colors from '../constants/colors';
import { copy } from '../constants/strings';

const COLORS = {
  background: Colors.background,
  navy: Colors.textPrimary,
  teal: Colors.primary,
  tealDark: Colors.primaryPressed,
  tealPale: Colors.primaryLight,
  body: Colors.textSecondary,
  white: Colors.surface,
  border: Colors.border,
  purple: Colors.accent,
  purplePale: Colors.accentLight,
  online: Colors.online,
  offline: Colors.offline,
  busy: Colors.busy,
};

const formatOnlineTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map(value => String(value).padStart(2, '0'))
    .join(':');
};

interface Props {
  navigation: any;
}

const FemaleHomeScreen: React.FC<Props> = ({ navigation }) => {
  const [goingOnline, setGoingOnline] = useState(false);
  const [onlineStartedAt, setOnlineStartedAt] = useState<number | null>(null);
  const [onlineSeconds, setOnlineSeconds] = useState(0);
  const [requestingWithdrawal, setRequestingWithdrawal] = useState(false);
  const [minimumWithdrawalAmount, setMinimumWithdrawalAmount] = useState(
    DEFAULT_MIN_EXPERT_WITHDRAWAL_AMOUNT,
  );
  const fullScreenPermissionPrompted = useRef(false);
  const profilePulse = useRef(new Animated.Value(0)).current;

  const { user, refreshUser } = useUser();
  const { activeCall, showCall } = useActiveCall();
  const { width: windowWidth } = useWindowDimensions();
  const availabilityButtonSize = Math.min(
    184,
    Math.max(150, Math.round(windowWidth * 0.42)),
  );
  const tamilName = String(user?.profile?.tamilName || '').trim();
  const englishName = String(user?.profile?.name || '').trim();
  const displayName = tamilName || englishName || 'Host';
  const showEnglishName = Boolean(
    tamilName && englishName && tamilName !== englishName,
  );
  const isBusy = user?.profile?.status === 'busy';
  const isOnline = user?.profile?.status === 'online' || isBusy;
  const onlineTimerStorageKey = user?.uid
    ? `hostOnlineStartedAt:${user.uid}`
    : null;
  const statusColor = isBusy
    ? COLORS.busy
    : isOnline
    ? COLORS.online
    : COLORS.offline;
  const totalEarnings = Number(user?.expertEarnings?.total || 0);
  const availableEarnings = Number(user?.expertEarnings?.available || 0);
  const pendingWithdrawal = user?.expertEarnings?.pendingWithdrawal;

  const ensureFullScreenCallPermission = useCallback(async () => {
    if (Platform.OS !== 'android' || Number(Platform.Version) < 34) return true;
    try {
      const canUse =
        await NativeModules.CallNotification?.canUseFullScreenIntent?.();
      if (canUse) return true;
    } catch (error) {
      console.warn('Unable to check full-screen call permission:', error);
    }

    if (fullScreenPermissionPrompted.current) return false;
    fullScreenPermissionPrompted.current = true;

    Alert.alert(
      'Full-screen call alerts allow karo',
      'Yeh optional hai. Aap online aa sakte ho. Full-screen notifications allow karne se lock screen par incoming-call alert milta hai.',
      [
        { text: 'Abhi Nahi', style: 'cancel' },
        {
          text: 'Settings Kholo',
          onPress: async () => {
            try {
              const callNotification = NativeModules.CallNotification;
              if (
                typeof callNotification?.openFullScreenIntentSettings ===
                'function'
              ) {
                await callNotification.openFullScreenIntentSettings();
                return;
              }

              throw new Error(
                'Is app version mein full-screen settings ka support nahi hai.',
              );
            } catch (error) {
              console.warn(
                'Unable to open full-screen notification settings:',
                error,
              );
              Alert.alert(
                'Setting Available Nahi Hai',
                'Speakly 121 update karke dobara try karo. Is setting ke bina bhi online aa sakte ho.',
              );
            }
          },
        },
      ],
    );
    return false;
  }, []);

  useEffect(() => {
    if (
      !isOnline ||
      Platform.OS !== 'android' ||
      fullScreenPermissionPrompted.current
    ) {
      return;
    }
    ensureFullScreenCallPermission().catch(error =>
      console.warn('Unable to verify full-screen call access:', error),
    );
  }, [ensureFullScreenCallPermission, isOnline]);

  useEffect(
    () => listenMinimumWithdrawalAmount(setMinimumWithdrawalAmount),
    [],
  );

  useEffect(() => {
    if (!onlineTimerStorageKey) return undefined;
    let cancelled = false;

    if (!isOnline) {
      setOnlineStartedAt(null);
      setOnlineSeconds(0);
      AsyncStorage.removeItem(onlineTimerStorageKey).catch(error =>
        console.warn('Unable to clear host online timer:', error),
      );
      return () => {
        cancelled = true;
      };
    }

    AsyncStorage.getItem(onlineTimerStorageKey)
      .then(savedTimestamp => {
        if (cancelled) return;
        const parsedTimestamp = Number(savedTimestamp);
        const startedAt =
          Number.isFinite(parsedTimestamp) && parsedTimestamp > 0
            ? parsedTimestamp
            : Date.now();
        if (startedAt !== parsedTimestamp) {
          AsyncStorage.setItem(onlineTimerStorageKey, String(startedAt)).catch(
            error => console.warn('Unable to save host online timer:', error),
          );
        }
        setOnlineStartedAt(startedAt);
      })
      .catch(error => {
        console.warn('Unable to restore host online timer:', error);
        if (!cancelled) setOnlineStartedAt(Date.now());
      });

    return () => {
      cancelled = true;
    };
  }, [isOnline, onlineTimerStorageKey]);

  useEffect(() => {
    if (!isOnline || onlineStartedAt === null) {
      setOnlineSeconds(0);
      return undefined;
    }

    const updateElapsedTime = () => {
      setOnlineSeconds(
        Math.max(0, Math.floor((Date.now() - onlineStartedAt) / 1000)),
      );
    };
    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 1000);
    return () => clearInterval(interval);
  }, [isOnline, onlineStartedAt]);

  useEffect(() => {
    if (!isOnline) {
      profilePulse.stopAnimation();
      profilePulse.setValue(0);
      return undefined;
    }

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(profilePulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(profilePulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [isOnline, profilePulse]);

  const requestWithdrawal = async () => {
    if (requestingWithdrawal) return;
    try {
      setRequestingWithdrawal(true);
      const request = await requestExpertWithdrawal();
      Alert.alert(
        'Withdrawal Request Bhej Di',
        `Aapki ₹${request.amount} ki request bhej di gayi hai. Admin ise check karke process karega. Review ke dauraan aapke registered number par contact kiya ja sakta hai.`,
      );
    } catch (error: any) {
      Alert.alert(
        'Withdrawal Request Nahi Gayi',
        error?.message || 'Dobara try karo.',
      );
    } finally {
      setRequestingWithdrawal(false);
    }
  };

  const goOnLine = async () => {
    if (activeCall) {
      showCall();
      return;
    }
    if (goingOnline) {
      return;
    }

    // Full-screen call access improves incoming-call presentation, but it is
    // not required for a host to be available or receive notifications.
    await ensureFullScreenCallPermission();

    try {
      setGoingOnline(true);
      await RoomService.goOnline();
      const startedAt = Date.now();
      setOnlineStartedAt(startedAt);
      setOnlineSeconds(0);
      if (onlineTimerStorageKey) {
        AsyncStorage.setItem(onlineTimerStorageKey, String(startedAt)).catch(
          error => console.warn('Unable to save host online timer:', error),
        );
      }
      await refreshUser();
    } catch (error) {
      console.log('Unable to go online:', error);
      Alert.alert('Online Nahi Aa Paaye', 'Thodi der baad dobara try karo.');
    } finally {
      setGoingOnline(false);
    }
  };

  const goOffline = () => {
    if (activeCall) {
      showCall();
      return;
    }
    if (goingOnline) return;

    Alert.alert(
      'Offline Jaana Hai?',
      'Offline hone par nayi calls nahi aayengi.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: copy.host.goOffline,
          style: 'destructive',
          onPress: async () => {
            try {
              setGoingOnline(true);
              await RoomService.goOffline();
              setOnlineStartedAt(null);
              setOnlineSeconds(0);
              if (onlineTimerStorageKey) {
                AsyncStorage.removeItem(onlineTimerStorageKey).catch(error =>
                  console.warn('Unable to clear host online timer:', error),
                );
              }
              await refreshUser();
            } catch (error) {
              console.log('Unable to go offline:', error);
              Alert.alert(
                'Offline Nahi Ho Paaye',
                'Thodi der baad dobara try karo.',
              );
            } finally {
              setGoingOnline(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.brandHeader}>
          <View style={styles.brandMark}>
            <MaterialCommunityIcons
              name="waveform"
              size={26}
              color={COLORS.white}
            />
          </View>
          <Text style={styles.brandName}>{copy.brand.appName}</Text>
        </View>

        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>
              {copy.host.dashboard.toUpperCase()}
            </Text>
            <Text numberOfLines={1} style={styles.userName}>
              {displayName}
            </Text>
            {showEnglishName && (
              <Text numberOfLines={1} style={styles.userEnglishName}>
                {englishName}
              </Text>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() =>
              navigation.navigate('ProfileSetting', { gender: 'female' })
            }
            style={styles.avatarButton}
          >
            <View style={styles.avatarShell}>
              {isOnline && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.avatarPulse,
                    {
                      borderColor: statusColor,
                      opacity: profilePulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.55, 0],
                      }),
                      transform: [
                        {
                          scale: profilePulse.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.82, 1.58],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              )}
              <Image source={getUserAvatar(user)} style={styles.avatar} />
              <View
                style={[
                  styles.avatarStatus,
                  { backgroundColor: statusColor },
                ]}
              />
            </View>
            {isOnline && (
              <View
                style={[
                  styles.listeningBadge,
                  isBusy && styles.listeningBadgeBusy,
                ]}
              >
                <Ionicons
                  name={isBusy ? 'call' : 'radio-outline'}
                  size={10}
                  color={statusColor}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.listeningText, { color: statusColor }]}
                >
                  {isBusy ? 'Call Par Hoon' : 'Calls Sun Rahi Hoon'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusCopy}>
            <View style={styles.statusHeader}>
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: statusColor },
                ]}
              />
              <Text style={styles.statusTitle}>Account Ka Status</Text>
            </View>

            <Text
              style={[styles.statusValue, { color: statusColor }]}
            >
              {isBusy ? 'Busy' : isOnline ? 'Online' : 'Offline'}
            </Text>

            <Text style={styles.statusDescription}>
              Aapki Profile Abhi{' '}
              <Text style={styles.statusEmphasis}>
                {isOnline ? 'visible' : 'hidden'}
              </Text>
              {' customers ko.'}
            </Text>
          </View>

          <View style={styles.visibilityIcon}>
            <Ionicons
              name={isOnline ? 'eye-outline' : 'eye-off-outline'}
              size={34}
              color={statusColor}
            />
          </View>
        </View>

        <View style={styles.primaryActionSection}>
          <Text style={styles.primaryActionLabel}>
            {isOnline ? 'Aap Available Ho' : 'Calls Lene Ke Liye Ready Ho?'}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isOnline ? 'Offline Jao' : 'Online Aao'}
            activeOpacity={0.86}
            onPress={isOnline ? goOffline : goOnLine}
            disabled={goingOnline}
            style={[
              styles.onlineButtonTouch,
              {
                width: availabilityButtonSize,
                height: availabilityButtonSize,
                borderRadius: availabilityButtonSize / 2,
              },
              isOnline ? styles.offlineButtonShadow : styles.onlineButtonShadow,
            ]}
          >
            <LinearGradient
              colors={
                isOnline ? ['#6B7280', '#4B5563'] : ['#22C55E', '#15803D']
              }
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={[
                styles.onlineButton,
                {
                  width: availabilityButtonSize,
                  height: availabilityButtonSize,
                  borderRadius: availabilityButtonSize / 2,
                },
                goingOnline && styles.loadingButton,
              ]}
            >
              {goingOnline ? (
                <ActivityIndicator size="large" color={COLORS.white} />
              ) : (
                <>
                  <View style={styles.onlineIconCircle}>
                    <Ionicons
                      name={isOnline ? 'power-outline' : 'radio-outline'}
                      size={Math.round(availabilityButtonSize * 0.2)}
                      color={COLORS.white}
                    />
                  </View>
                  <Text style={styles.onlineText}>
                    {isOnline
                      ? copy.host.goOffline.toUpperCase()
                      : copy.host.goOnline.toUpperCase()}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          {isOnline && (
            <View
              accessibilityLiveRegion="polite"
              style={styles.onlineTimer}
            >
              <Text style={styles.onlineTimerLabel}>
                Online Rehne Ka Samay
              </Text>
              <Text style={styles.onlineTimerValue}>
                {formatOnlineTime(onlineSeconds)}
              </Text>
            </View>
          )}
          <Text style={styles.primaryActionHint}>
            {goingOnline
              ? isOnline
                ? 'Aapka Status Update Ho Raha Hai…'
                : 'Aapko Online La Rahe Hain…'
              : isOnline
              ? 'Calls rokne ke liye tap karo'
              : 'Online aane aur calls lene ke liye tap karo'}
          </Text>
        </View>

        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <View>
              <Text style={styles.earningsEyebrow}>
                {copy.host.earnings.toUpperCase()}
              </Text>
              <Text style={styles.earningsTotal}>₹{totalEarnings}</Text>
              <Text style={styles.earningsAvailable}>{`₹${availableEarnings} available hain`}</Text>
            </View>
            <View style={styles.earningsIcon}>
              <Ionicons
                name="wallet-outline"
                size={30}
                color={COLORS.tealDark}
              />
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={
              requestingWithdrawal ||
              availableEarnings < minimumWithdrawalAmount ||
              Boolean(pendingWithdrawal?.id)
            }
            onPress={requestWithdrawal}
            style={[
              styles.withdrawButton,
              (availableEarnings < minimumWithdrawalAmount ||
                pendingWithdrawal?.id) &&
                styles.withdrawButtonDisabled,
            ]}
          >
            {requestingWithdrawal ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.withdrawButtonText}>
                {pendingWithdrawal?.id
                  ? `Withdrawal Pending Hai · ₹${Number(
                      pendingWithdrawal.amount || 0,
                    )}`
                  : 'Withdrawal Request Karo'}
              </Text>
            )}
          </TouchableOpacity>

          {!pendingWithdrawal?.id &&
            availableEarnings > 0 &&
            availableEarnings < minimumWithdrawalAmount && (
              <Text style={styles.withdrawalMinimum}>
                {`Kam se kam ₹${minimumWithdrawalAmount} par withdrawal kar sakte ho.`}
              </Text>
            )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 128,
  },
  brandHeader: {
    minHeight: 54,
    marginHorizontal: 20,
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealDark,
  },
  brandName: {
    marginLeft: 10,
    color: COLORS.navy,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  header: {
    minHeight: 112,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    paddingTop: 14,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 16,
  },
  greeting: {
    color: COLORS.tealDark,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.1,
  },
  userName: {
    marginTop: 6,
    color: COLORS.navy,
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  userEnglishName: {
    marginTop: 1,
    color: COLORS.body,
    fontSize: 13,
  },
  avatarButton: {
    marginTop: -5,
    alignItems: 'center',
    zIndex: 1,
  },
  avatarShell: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  avatarPulse: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 3,
    borderColor: COLORS.white,
    backgroundColor: COLORS.tealPale,
  },
  avatarStatus: {
    position: 'absolute',
    right: 1,
    bottom: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.white,
    backgroundColor: COLORS.online,
  },
  avatarStatusOffline: {
    backgroundColor: COLORS.offline,
  },
  listeningBadge: {
    minHeight: 20,
    marginTop: 7,
    paddingHorizontal: 7,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 4,
    backgroundColor: '#E6F8ED',
  },
  listeningBadgeBusy: {
    backgroundColor: '#FFE7EE',
  },
  listeningText: {
    maxWidth: 108,
    fontSize: 9,
    fontWeight: '800',
  },
  onlineButtonTouch: {
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    elevation: 12,
  },
  onlineButtonShadow: {
    shadowColor: Colors.successStrong,
  },
  offlineButtonShadow: {
    shadowColor: '#4B5563',
  },
  onlineButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  loadingButton: {
    opacity: 0.78,
  },
  primaryActionSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 2,
  },
  primaryActionLabel: {
    marginBottom: 15,
    color: COLORS.body,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  primaryActionHint: {
    marginTop: 15,
    color: COLORS.body,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  onlineTimer: {
    minWidth: 180,
    marginTop: 15,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  onlineTimerLabel: {
    color: COLORS.body,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  onlineTimerValue: {
    marginTop: 2,
    color: COLORS.navy,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  earningsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  earningsEyebrow: {
    color: COLORS.tealDark,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  earningsTotal: {
    marginTop: 4,
    color: COLORS.navy,
    fontSize: 28,
    fontWeight: '900',
  },
  earningsAvailable: { marginTop: 2, color: COLORS.body, fontSize: 14 },
  earningsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealPale,
  },
  withdrawButton: {
    minHeight: 44,
    marginTop: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealDark,
  },
  withdrawButtonDisabled: { opacity: 0.5 },
  withdrawButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  withdrawalMinimum: {
    marginTop: 8,
    color: COLORS.body,
    fontSize: 12,
    textAlign: 'center',
  },
  onlineIconCircle: {
    width: 68,
    height: 68,
    marginBottom: 10,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  onlineText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  statusCard: {
    minHeight: 132,
    marginHorizontal: 20,
    marginBottom: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#EEF0F5',
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.035,
    shadowRadius: 16,
    elevation: 2,
  },
  statusCopy: {
    flex: 1,
    zIndex: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 11,
    height: 11,
    marginRight: 10,
    borderRadius: 6,
    backgroundColor: COLORS.online,
  },
  statusIndicatorOffline: {
    backgroundColor: COLORS.offline,
  },
  statusTitle: {
    color: COLORS.body,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  statusValue: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  statusDescription: {
    width: '94%',
    marginTop: 4,
    color: COLORS.body,
    fontSize: 13,
    lineHeight: 18,
  },
  statusEmphasis: {
    fontWeight: '800',
  },
  visibilityIcon: {
    width: 56,
    height: 56,
    marginLeft: -18,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purplePale,
  },
});

export default FemaleHomeScreen;
