import Colors from '../../../constants/colors';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scopedDatabase as database } from '../../../firebase/firebase';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import styles from './styles';
import strings, { copy } from '../../../constants/strings';
import RoomService from '../../../firebase/RoomService';
import { getFemaleAvatar, getMaleAvatar } from '../../../constants/constants';
import {
  startOutgoingRingback,
  stopOutgoingRingback,
} from '../../../utils/outgoingRingback';
import { trackCallLifecycle } from '../../../firebase/analytics';
import { useCallBalanceGuard } from '../../../hooks/useCallBalanceGuard';

interface Props {
  navigation: any;
  route: any;
}

export const OutgoingCallScreen: React.FC<Props> = ({ navigation, route }) => {
  const { height } = useWindowDimensions();
  const compactLayout = height < 700;
  const data = route?.params?.user;
  const expectedCallId = route?.params?.room?.currentCallId;
  const femaleUid = data.uid;
  const tamilName = String(data?.tamilName || '').trim();
  const englishName = String(data?.name || '').trim();
  const displayName = tamilName || englishName || 'N/A';
  const showEnglishName = Boolean(
    tamilName && englishName && tamilName !== englishName,
  );

  const ripple = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const callResolved = useRef(false);
  const timedOut = useRef(false);
  const ringingTracked = useRef(false);
  const terminalTracked = useRef(false);

  const [cancelling, setCancelling] = useState(false);
  const [retryProgress, setRetryProgress] = useState<number | null>(null);
  const retryCancelled = useRef(false);
  const canStartCall = useCallBalanceGuard(navigation);
  const attemptedHosts: string[] = route.params?.attemptedHosts || [femaleUid];
  useEffect(() => {
    if (retryProgress === null) return;
    const timer = setInterval(
      () =>
        setRetryProgress(value =>
          value === null ? null : Math.min(100, value + 5),
        ),
      150,
    );
    return () => clearInterval(timer);
  }, [retryProgress === null]);
  useEffect(() => {
    if (retryProgress !== 100) return;
    setRetryProgress(null);
    const retry = async () => {
      try {
        const next = await RoomService.getRandomFemaleRoom(
          attemptedHosts,
          Number(route.params?.room?.callRatePerMinute || data.price || 5),
        );
        if (retryCancelled.current) return;
        if (!canStartCall(next.callRatePerMinute)) {
          navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
          return;
        }
        const room = await RoomService.callFemale(
          next.female.uid,
          Number(route.params?.room?.callRatePerMinute || data.price || 5),
        );
        if (retryCancelled.current) {
          await RoomService.menRejectCall(next.female.uid, room.currentCallId);
          return;
        }
        navigation.replace('OutgoingCall', {
          user: next.female,
          room,
          attemptedHosts: [...attemptedHosts, next.female.uid],
        });
      } catch (error: any) {
        if (!retryCancelled.current) {
          navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
          Alert.alert(
            copy.call.timeout,
            error?.message || 'Abhi koi expert available nahi hai.',
          );
        }
      }
    };
    retry();
  }, [retryProgress]);
  useEffect(
    () => () => {
      retryCancelled.current = true;
    },
    [],
  );
  const [callPhase, setCallPhase] = useState<'calling' | 'ringing'>('calling');

  useEffect(
    () =>
      navigation.addListener?.('beforeRemove', () => {
        retryCancelled.current = true;
        if (!callResolved.current) {
          callResolved.current = true;
          stopOutgoingRingback();
          RoomService.menRejectCall(femaleUid, expectedCallId).catch(
            console.warn,
          );
        }
      }),
    [navigation, femaleUid, expectedCallId],
  );

  useEffect(() => {
    trackCallLifecycle('OutgoingCallAttempted', {
      ...(femaleUid ? { expert_id: femaleUid } : {}),
    });
    startOutgoingRingback();
    return stopOutgoingRingback;
  }, []);

  const cancelCall = async () => {
    if (callResolved.current) {
      retryCancelled.current = true;
      setRetryProgress(null);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      return;
    }
    if (cancelling) {
      return;
    }

    try {
      setCancelling(true);
      stopOutgoingRingback();
      timedOut.current = false;
      trackCallLifecycle('OutgoingCallCancelled', {
        ...(femaleUid ? { expert_id: femaleUid } : {}),
      });
      await RoomService.menRejectCall(femaleUid, expectedCallId);
    } catch (error) {
      console.error('Unable to cancel call:', error);
      setCancelling(false);
      Alert.alert('Call Cancel Nahi Hui', 'Dobara try karo.');
    }
  };

  useEffect(() => {
    callResolved.current = false;

    const timeout = setTimeout(async () => {
      if (callResolved.current || retryCancelled.current) return;
      const snapshot = await database().ref(`rooms/${femaleUid}`).once('value');
      if (callResolved.current || retryCancelled.current) return;
      const room = snapshot.val();
      if (
        room?.currentCallId === expectedCallId &&
        ['calling', 'ringing'].includes(room?.status)
      ) {
        timedOut.current = true;
        await RoomService.menRejectCall(femaleUid, expectedCallId);
      }
    }, 30000);

    const unsubscribe = RoomService.listenCallStatus(
      femaleUid,

      room => {
        const closeCall = (title?: string, message?: string) => {
          if (callResolved.current) {
            return;
          }

          callResolved.current = true;
          clearTimeout(timeout);
          stopOutgoingRingback();

          navigation.reset({
            index: 0,
            routes: [{ name: 'Main', params: { screen: 'Home' } }],
          });

          if (title && message) {
            setTimeout(
              () =>
                Alert.alert(title, message, [{ text: copy.call.failedAction }]),
              200,
            );
          }
        };

        if (room?.currentCallId !== expectedCallId) {
          closeCall();
          return;
        }
        switch (room?.status) {
          case 'calling':
            setCallPhase('calling');
            break;

          case 'ringing':
            if (!ringingTracked.current) {
              ringingTracked.current = true;
              trackCallLifecycle('OutgoingCallRinging', {
                ...(femaleUid ? { expert_id: femaleUid } : {}),
              });
            }
            setCallPhase('ringing');
            break;

          case 'accepted':
            if (callResolved.current) {
              return;
            }

            callResolved.current = true;
            clearTimeout(timeout);
            stopOutgoingRingback();
            navigation.replace('Call', {
              gender: 'male',
              userName: englishName || displayName,
              tamilName,
              expertGender: data?.gender,
              avatarId: data?.avatarId,
              femaleUid: data?.uid,
              callRatePerMinute: room?.callRatePerMinute,
              callId: room?.currentCallId,
              channelName: room?.agora?.channelName,
              agora: room?.agora,
            });
            break;

          case 'rejected':
            if (!terminalTracked.current) {
              terminalTracked.current = true;
              trackCallLifecycle('OutgoingCallRejected', {
                ...(femaleUid ? { expert_id: femaleUid } : {}),
              });
            }
            closeCall(copy.call.rejected, copy.call.rejectedMessage);
            break;

          case 'men_rejected':
            if (!terminalTracked.current) {
              terminalTracked.current = true;
              trackCallLifecycle(
                timedOut.current
                  ? 'OutgoingCallTimedOut'
                  : 'OutgoingCallCancelled',
                { ...(femaleUid ? { expert_id: femaleUid } : {}) },
              );
            }
            if (timedOut.current) {
              callResolved.current = true;
              clearTimeout(timeout);
              stopOutgoingRingback();
              setRetryProgress(0);
            } else closeCall();
            break;

          case 'waiting':
            closeCall();
            break;

          case 'ended':
          case 'offline':
            closeCall(
              copy.call.timeout,
              'Expert abhi available nahi hai. Dusra expert chuno.',
            );
            break;
        }
      },
    );

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [
    data?.avatarId,
    data?.gender,
    data?.name,
    data?.tamilName,
    data?.uid,
    displayName,
    englishName,
    femaleUid,
    navigation,
    tamilName,
  ]);

  useEffect(() => {
    const rippleAnimation = Animated.loop(
      Animated.timing(ripple, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),

        Animated.timing(glow, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    rippleAnimation.start();
    glowAnimation.start();

    return () => {
      rippleAnimation.stop();
      glowAnimation.stop();
    };
  }, [glow, ripple]);

  const rippleScale = ripple.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.9],
  });

  const rippleOpacity = ripple.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 0],
  });

  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      {retryProgress !== null && (
        <View style={{ padding: 16 }}>
          <TouchableOpacity
            accessibilityLabel="Automatic call cancel karo"
            onPress={() => {
              retryCancelled.current = true;
              setRetryProgress(null);
              navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
            }}
          >
            <Text>Agla expert connect ho raha hai… {retryProgress}% ✕</Text>
          </TouchableOpacity>
          <View style={{ height: 4, backgroundColor: Colors.border }}>
            <View
              style={{
                height: 4,
                width: `${retryProgress}%`,
                backgroundColor: Colors.primary,
              }}
            />
          </View>
        </View>
      )}
      <View style={[styles.header, compactLayout && styles.headerCompact]}>
        <Text style={styles.logo}>{strings.appName}</Text>

        <Text style={styles.status}>
          {callPhase === 'ringing' ? 'Ringing...' : copy.call.outgoing}
        </Text>

        <Text style={styles.statusSub}>
          {callPhase === 'ringing' ? 'Ringing ' : 'Calling '}
          <Text style={styles.statusTamilName}>{displayName}</Text>
          {showEnglishName && (
            <Text style={styles.statusEnglishName}>{` (${englishName})`}</Text>
          )}{' '}
          {callPhase === 'calling' ? '...' : ''}
        </Text>
      </View>

      <View style={[styles.body, compactLayout && styles.bodyCompact]}>
        <Animated.View
          style={[
            styles.avatarWrapper,
            compactLayout && styles.avatarWrapperCompact,
            {
              transform: [{ scale: glowScale }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: rippleOpacity,
                transform: [{ scale: rippleScale }],
              },
            ]}
          />

          <View
            style={[
              styles.avatarBorder,
              compactLayout && styles.avatarBorderCompact,
            ]}
          >
            <Image
              source={
                String(data?.gender).toLowerCase() === 'female'
                  ? getFemaleAvatar(data?.avatarId)
                  : getMaleAvatar(data?.avatarId)
              }
              style={[styles.avatar, compactLayout && styles.avatarCompact]}
            />
          </View>
        </Animated.View>

        <Text style={[styles.name, compactLayout && styles.nameCompact]}>
          {displayName}
        </Text>

        {showEnglishName && (
          <Text style={styles.englishName}>{englishName}</Text>
        )}

        <Text style={styles.city}>{copy.host.roleName}</Text>

        <View
          style={[
            styles.waveContainer,
            compactLayout && styles.waveContainerCompact,
          ]}
        >
          <Animated.View
            style={[
              styles.ripple,
              {
                opacity: rippleOpacity,
                transform: [{ scale: rippleScale }],
              },
            ]}
          />

          <TouchableOpacity activeOpacity={0.9} style={styles.phoneButton}>
            <Icon name="phone" size={24} color={Colors.inkBlue} />
          </TouchableOpacity>

          <Text style={styles.callingText}>
            {callPhase === 'ringing'
              ? 'Jawab ka intezaar hai'
              : 'Expert Se Connect Ho Raha Hai'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Icon name="headphones" size={28} color={Colors.secondary} />

        <Text style={styles.footerText}>
          Saaf awaaz ke liye headphones lagao.
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.endButton}
        onPress={cancelCall}
        disabled={cancelling}
      >
        <Text style={styles.endText}>
          {cancelling ? 'Cancelling...' : 'Call Cancel Karo'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};
