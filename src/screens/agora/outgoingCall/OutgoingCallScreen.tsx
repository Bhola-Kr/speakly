import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import database from '@react-native-firebase/database';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import styles from './styles';
import strings from '../../../constants/strings';
import RoomService from '../../../firebase/RoomService';
import { calculateAge, getFemaleAvatar } from '../../../constants/constants';

interface Props {
  navigation: any;
  route: any;
}

export const OutgoingCallScreen: React.FC<Props> = ({ navigation, route }) => {
  const data = route?.params?.user;
  console.log('data', data);
  const femaleUid = data.uid;

  const ripple = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const callResolved = useRef(false);

  const [dots, setDots] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const cancelCall = async () => {
    if (cancelling) {
      return;
    }

    try {
      setCancelling(true);
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
      if (room?.status === 'ringing') {
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

          if (title && message) {
            Alert.alert(title, message, [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
            return;
          }

          navigation.goBack();
        };

        switch (room?.status) {
          case 'accepted':
            if (callResolved.current) {
              return;
            }

            callResolved.current = true;
            clearTimeout(timeout);
            navigation.replace('Call', {
              gender: 'male',
              userName: data?.name,
              avatarId: data?.avatarId,
              femaleUid: data?.uid,
              agora: room?.agora,
            });
            break;

          case 'rejected':
            closeCall(
              'Call Ended',
              'Your call request was declined by the recipient.',
            );
            break;

          case 'men_rejected':
            closeCall();
            break;

          case 'waiting':
            closeCall();
            break;

          case 'ended':
        }
      },
    );

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [data?.avatarId, data?.name, data?.uid, femaleUid, navigation]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(ripple, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
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
    ).start();

    const timer = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) {
          return '';
        }

        return prev + '.';
      });
    }, 500);

    return () => clearInterval(timer);
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
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.logo}>{strings.appName}</Text>

        <Text style={styles.status}>Connecting{dots}</Text>

        <Text style={styles.statusSub}>{`Waiting for ${
          data?.name ?? 'N/A'
        } to answer`}</Text>
      </View>

      <View style={styles.body}>
        <Animated.View
          style={[
            styles.avatarWrapper,
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

          <View style={styles.avatarBorder}>
            <Image
              source={getFemaleAvatar(data?.avatarId)}
              style={styles.avatar}
            />
          </View>
        </Animated.View>

        <Text style={styles.name}>{`${data?.name ?? 'N/A'}`}</Text>

        <Text style={styles.city}>{`${data?.maritalStatus} • ${calculateAge(
          data?.birthYear,
        )} Years`}</Text>

        <View style={styles.waveContainer}>
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
            <Icon name="phone" size={34} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.callingText}>Calling user...</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Icon name="headphones" size={28} color="#D4AF37" />

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
