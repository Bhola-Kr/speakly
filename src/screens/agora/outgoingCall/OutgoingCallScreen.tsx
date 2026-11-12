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

interface Props {
  navigation: any;
  route: any;
}

export const OutgoingCallScreen: React.FC<Props> = ({ navigation, route }) => {
  const { height } = useWindowDimensions();
  const compactLayout = height < 700;
  const data = route?.params?.user;
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

  const [cancelling, setCancelling] = useState(false);
  const [callPhase, setCallPhase] = useState<'calling' | 'ringing'>('calling');

  const cancelCall = async () => {
    if (cancelling) {
      return;
    }

    try {
      setCancelling(true);
      timedOut.current = false;
      await RoomService.menRejectCall(femaleUid);
    } catch (error) {
      console.error('Unable to cancel call:', error);
      setCancelling(false);
      Alert.alert('Unable to Cancel Call', 'Please try again.');
    }
  };

  useEffect(() => {
    callResolved.current = false;

    const timeout = setTimeout(async () => {
      const snapshot = await database().ref(`rooms/${femaleUid}`).once('value');
      const room = snapshot.val();
      if (['calling', 'ringing'].includes(room?.status)) {
        timedOut.current = true;
        await RoomService.menRejectCall(femaleUid);
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

          navigation.reset({
            index: 0,
            routes: [{ name: 'Main', params: { screen: 'Home' } }],
          });

          if (title && message) {
            setTimeout(
              () =>
                Alert.alert(title, message, [
                  { text: copy.call.failedAction },
                ]),
              200,
            );
          }
        };

        switch (room?.status) {
          case 'calling':
            setCallPhase('calling');
            break;

          case 'ringing':
            setCallPhase('ringing');
            break;

          case 'accepted':
            if (callResolved.current) {
              return;
            }

            callResolved.current = true;
            clearTimeout(timeout);
            navigation.replace('Call', {
              gender: 'male',
              userName: englishName || displayName,
              tamilName,
              expertGender: data?.gender,
              avatarId: data?.avatarId,
              femaleUid: data?.uid,
              callRatePerMinute: room?.callRatePerMinute,
              callId: room?.currentCallId,
              agora: room?.agora,
            });
            break;

          case 'rejected':
            closeCall(
              copy.call.rejected,
              copy.call.rejectedMessage,
            );
            break;

          case 'men_rejected':
            timedOut.current
              ? closeCall(
                  copy.call.timeout,
                  'This host did not answer. Try another available host.',
                )
              : closeCall();
            break;

          case 'waiting':
            closeCall();
            break;

          case 'ended':
          case 'offline':
            closeCall(
              copy.call.timeout,
              'This host is not available right now. Try another host.',
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
            {callPhase === 'ringing' ? 'Waiting for an answer' : 'Contacting host'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Icon name="headphones" size={28} color={Colors.secondary} />

        <Text style={styles.footerText}>
          Use headphones for better voice quality and reduced background noise.
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.endButton}
        onPress={cancelCall}
        disabled={cancelling}
      >
        <Text style={styles.endText}>
          {cancelling ? 'Cancelling...' : 'Cancel Call'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};
