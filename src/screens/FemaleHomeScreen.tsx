import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  NativeModules,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

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
};

interface Props {
  navigation: any;
}

const FemaleHomeScreen: React.FC<Props> = ({ navigation }) => {
  const [goingOnline, setGoingOnline] = useState(false);
  const [requestingWithdrawal, setRequestingWithdrawal] = useState(false);
  const [minimumWithdrawalAmount, setMinimumWithdrawalAmount] = useState(
    DEFAULT_MIN_EXPERT_WITHDRAWAL_AMOUNT,
  );
  const fullScreenPermissionPrompted = useRef(false);

  const { user } = useUser();
  const { activeCall, showCall } = useActiveCall();
  const tamilName = String(user?.profile?.tamilName || '').trim();
  const englishName = String(user?.profile?.name || '').trim();
  const displayName = tamilName || englishName || 'Host';
  const showEnglishName = Boolean(
    tamilName && englishName && tamilName !== englishName,
  );
  const isOnline = user?.profile?.status === 'online';
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
      'Allow full-screen call alerts',
      'This is optional. You can still go online, but enabling full-screen notifications lets incoming calls open over the lock screen.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Open settings',
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
                'The installed app does not include full-screen settings support.',
              );
            } catch (error) {
              console.warn(
                'Unable to open full-screen notification settings:',
                error,
              );
              Alert.alert(
                'Setting unavailable',
                'Update Speakly 121 to the latest build, then try again. You can still go online without enabling this setting.',
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

  const requestWithdrawal = async () => {
    if (requestingWithdrawal) return;
    try {
      setRequestingWithdrawal(true);
      const request = await requestExpertWithdrawal();
      Alert.alert(
        'Withdrawal Requested',
        `Your request for ₹${request.amount} has been submitted. The admin will review and process it. During the review, they may contact you on your registered phone number.`,
      );
    } catch (error: any) {
      Alert.alert(
        'Unable to Request Withdrawal',
        error?.message || 'Please try again.',
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
      navigation.navigate('OnlineRoom');
    } catch (error) {
      console.log('Unable to go online:', error);
      Alert.alert('Unable to Go Online', 'Please try again in a moment.');
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
      'Go Offline?',
      'You will not receive any incoming calls while you are offline.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: copy.host.goOffline,
          style: 'destructive',
          onPress: async () => {
            try {
              setGoingOnline(true);
              await RoomService.goOffline();
            } catch (error) {
              console.log('Unable to go offline:', error);
              Alert.alert(
                'Unable to Go Offline',
                'Please try again in a moment.',
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
            <Image source={getUserAvatar(user)} style={styles.avatar} />
            <View
              style={[
                styles.avatarStatus,
                !isOnline && styles.avatarStatusOffline,
              ]}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusCopy}>
            <View style={styles.statusHeader}>
              <View
                style={[
                  styles.statusIndicator,
                  !isOnline && styles.statusIndicatorOffline,
                ]}
              />
              <Text style={styles.statusTitle}>ACCOUNT STATUS</Text>
            </View>

            <Text
              style={[styles.statusValue, isOnline && styles.statusValueOnline]}
            >
              {isOnline ? 'Online' : 'Offline'}
            </Text>

            <Text style={styles.statusDescription}>
              Your profile is currently{' '}
              <Text style={styles.statusEmphasis}>
                {isOnline ? 'visible' : 'hidden'}
              </Text>
              {' to callers.'}
            </Text>
          </View>

          <View style={styles.visibilityIcon}>
            <Ionicons
              name={isOnline ? 'eye-outline' : 'eye-off-outline'}
              size={34}
              color={isOnline ? COLORS.teal : COLORS.purple}
            />
          </View>
        </View>

        <View style={styles.primaryActionSection}>
          <Text style={styles.primaryActionLabel}>
            {isOnline ? 'YOU ARE AVAILABLE' : 'READY TO RECEIVE CALLS?'}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isOnline ? 'Go Offline' : 'Go Online'}
            activeOpacity={0.86}
            onPress={isOnline ? goOffline : goOnLine}
            disabled={goingOnline}
            style={[
              styles.onlineButtonTouch,
              isOnline ? styles.offlineButtonShadow : styles.onlineButtonShadow,
            ]}
          >
            <LinearGradient
              colors={
                isOnline ? ['#6B7280', '#4B5563'] : ['#22C55E', '#15803D']
              }
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={[styles.onlineButton, goingOnline && styles.loadingButton]}
            >
              {goingOnline ? (
                <ActivityIndicator size="large" color={COLORS.white} />
              ) : (
                <>
                  <View style={styles.onlineIconCircle}>
                    <Ionicons
                      name={isOnline ? 'power-outline' : 'radio-outline'}
                      size={38}
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
          <Text style={styles.primaryActionHint}>
            {goingOnline
              ? isOnline
                ? 'Updating your availability…'
                : 'Preparing your host room…'
              : isOnline
              ? 'Tap when you want to stop receiving calls'
              : 'Tap to become visible and receive calls'}
          </Text>
        </View>

        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <View>
              <Text style={styles.earningsEyebrow}>
                {copy.host.earnings.toUpperCase()}
              </Text>
              <Text style={styles.earningsTotal}>₹{totalEarnings}</Text>
              <Text style={styles.earningsAvailable}>
                ₹{availableEarnings} available
              </Text>
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
                  ? `Withdrawal pending · ₹${Number(
                      pendingWithdrawal.amount || 0,
                    )}`
                  : 'Request withdrawal'}
              </Text>
            )}
          </TouchableOpacity>

          {!pendingWithdrawal?.id &&
            availableEarnings > 0 &&
            availableEarnings < minimumWithdrawalAmount && (
              <Text style={styles.withdrawalMinimum}>
                Minimum withdrawal is ₹{minimumWithdrawalAmount}.
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
    paddingBottom: 120,
  },
  header: {
    minHeight: 102,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    paddingTop: 10,
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
  onlineButtonTouch: {
    width: 196,
    height: 196,
    borderRadius: 98,
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
    width: 196,
    height: 196,
    borderRadius: 98,
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
    marginBottom: 22,
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
  statusValueOnline: {
    color: Colors.successStrong,
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
