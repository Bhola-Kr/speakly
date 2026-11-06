import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StatusBar,
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
  Alert,
  AppState,
  ScrollView,
  useWindowDimensions,
} from 'react-native';

import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import InCallManager from 'react-native-incall-manager';

import IncomingCallModal from './IncomingCallModal';
import { getUserAvatar } from '../../constants/constants';
import { useUser } from '../../hooks/UserContext';
import RoomService, { Room } from '../../firebase/RoomService';
import authData from '../../firebase/authData';
import Colors from '../../constants/colors';
import { copy } from '../../constants/strings';

const AVATAR = 'https://i.pravatar.cc/400?img=47';

const COLORS = {
  background: Colors.background,
  navy: Colors.textPrimary,
  teal: Colors.primary,
  tealDark: Colors.primaryPressed,
  mint: Colors.accentLight,
  mintSoft: Colors.primaryLight,
  body: Colors.textSecondary,
  white: Colors.surface,
};

type Props = {
  navigation: any;
};

const OnlineRoomScreen = ({ navigation }: Props) => {
  const { user } = useUser();
  const { height } = useWindowDimensions();
  const compactLayout = height < 700;
  const [incomingRoom, setIncomingRoom] = useState<Room | null>(null);
  const isFocused = useIsFocused();
  const pulse = useRef(new Animated.Value(0)).current;
  const isJoiningCall = useRef(false);
  const myUid = authData.getCurrentUser()?.uid || 'unknown';

  const [timer, setTimer] = useState('00:00:00');
  const [showIncoming, setShowIncoming] = useState(false);

  const seconds = useRef(0);

  useFocusEffect(
    useCallback(() => {
      InCallManager.setKeepScreenOn(true);

      return () => {
        InCallManager.setKeepScreenOn(false);
      };
    }, []),
  );

  React.useEffect(() => {
    const unsubscribe = RoomService.listenCallStatus(myUid, room => {
      if (!room) {
        setIncomingRoom(null);
        setShowIncoming(false);
        return;
      }

      console.log('OnlineRoomScreen -> setShowIncoming', room.status);
      switch (room.status) {
        case 'ringing':
          setIncomingRoom(room);
          setShowIncoming(true);
          break;

        case 'active':
        case 'men_rejected':
        case 'rejected':
        case 'ended':
        case 'offline':
        case 'waiting':
          setIncomingRoom(null);
          setShowIncoming(false);
          break;
      }
    });

    const subscription = AppState.addEventListener('change', nextState => {
      if (!isFocused || isJoiningCall.current) return;
      InCallManager.setKeepScreenOn(nextState === 'active');
    });

    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, [isFocused, myUid]);

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),

        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();

    const timerInterval = setInterval(() => {
      seconds.current++;

      const h = Math.floor(seconds.current / 3600);
      const m = Math.floor((seconds.current % 3600) / 60);
      const s = seconds.current % 60;

      setTimer(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(
          s,
        ).padStart(2, '0')}`,
      );
    }, 1000);

    return () => {
      pulseAnimation.stop();
      clearInterval(timerInterval);
    };
  }, [pulse]);

  const avatarScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.035],
  });

  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0.58],
  });

  const acceptCall = async () => {
    if (!incomingRoom) {
      Alert.alert('Error', 'No incoming call found.');
      return;
    }

    setShowIncoming(false);
    await RoomService.acceptCall(myUid);
    isJoiningCall.current = true;
    navigation.replace('Call', {
      gender: 'female',
      userName: incomingRoom?.male?.name,
      avatarId: incomingRoom?.male?.avatarId,
      maleUid: incomingRoom?.male?.uid,
      femaleUid: myUid,
      callRatePerMinute: incomingRoom?.callRatePerMinute,
      uid: incomingRoom?.roomId,
      agora: incomingRoom?.agora,
    });
  };

  const declineCall = async () => {
    setShowIncoming(false);

    try {
      await RoomService.rejectCall(myUid);
    } catch (e) {
      console.log('goOffline ->', e);

      Alert.alert('Error', 'Unable to update your status. Please try again.');
    }
  };

  const goOffline = () => {
    Alert.alert(
      copy.host.goOffline,
      'Are you sure you want to go offline? You will not receive incoming calls while you are offline.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: copy.host.goOffline,
          style: 'destructive',
          onPress: async () => {
            try {
              await RoomService.goOffline();

              navigation.goBack();
            } catch (e) {
              console.log('goOffline ->', e);

              Alert.alert(
                'Error',
                'Unable to update your status. Please try again.',
              );
            }
          },
        },
      ],
      {
        cancelable: true,
      },
    );
  };

  return (
    <>
      <SafeAreaView
        style={styles.container}
        edges={['top', 'left', 'right', 'bottom']}
      >
        <StatusBar
          backgroundColor={COLORS.background}
          barStyle="dark-content"
        />

        <View pointerEvents="none" style={styles.backgroundArt}>
          <View style={styles.backgroundBlobTop} />
          <View style={styles.backgroundBlobLeft} />
          <View style={styles.backgroundBlobRight} />
          <View style={styles.backgroundBlobBottom} />
        </View>

        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            compactLayout && styles.contentCompact,
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{copy.host.dashboard}</Text>

            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>{copy.home.online}</Text>
            </View>
          </View>

          <View
            style={[
              styles.avatarStage,
              compactLayout && styles.avatarStageCompact,
            ]}
          >
            <Animated.View
              style={[
                styles.avatarOuterGlow,
                {
                  opacity: glowOpacity,
                  transform: [{ scale: avatarScale }],
                },
              ]}
            />
            <View style={styles.avatarHalo} />
            <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
              <LinearGradient
                colors={Colors.buttonGradient}
                style={styles.avatarBorder}
              >
                <View style={styles.avatarInnerBorder}>
                  <Image source={getUserAvatar(user)} style={styles.avatar} />
                </View>
              </LinearGradient>
            </Animated.View>
          </View>

          <View
            style={[
              styles.availabilityCard,
              compactLayout && styles.availabilityCardCompact,
            ]}
          >
            <View style={styles.audioIconGlow}>
              <View style={styles.audioIcon}>
                {[22, 34, 47, 32, 20].map((barHeight, index) => (
                  <View
                    key={index}
                    style={[styles.audioBar, { height: barHeight }]}
                  />
                ))}
              </View>
            </View>

            <Text style={styles.availableTitle}>You’re available</Text>
            <Text style={styles.availableSubtitle}>
              Waiting for incoming voice calls
            </Text>

            <View style={styles.listeningBadge}>
              <View style={styles.listeningDot} />
              <Text style={styles.listeningText}>Listening.</Text>
            </View>
          </View>

          <Text style={styles.timer}>{timer}</Text>

          <TouchableOpacity
            onPress={goOffline}
            activeOpacity={0.9}
            style={styles.offlineButtonTouch}
          >
            <LinearGradient
              colors={Colors.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.offlineButton}
            >
              <MaterialCommunityIcons
                name="power"
                color={COLORS.white}
                size={29}
              />
              <Text style={styles.offlineText}>{copy.host.goOffline}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <IncomingCallModal
        visible={showIncoming && isFocused}
        onAccept={acceptCall}
        onDecline={declineCall}
        userName={incomingRoom?.male?.name || 'N/A'}
        verified={false}
        avatar={AVATAR}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundArt: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  backgroundBlobTop: {
    position: 'absolute',
    width: 330,
    height: 230,
    top: -125,
    right: -92,
    borderRadius: 160,
    backgroundColor: 'rgba(252,229,235,0.72)',
    transform: [{ rotate: '17deg' }],
  },
  backgroundBlobLeft: {
    position: 'absolute',
    width: 320,
    height: 420,
    top: 110,
    left: -210,
    borderRadius: 180,
    backgroundColor: 'rgba(255,229,237,0.60)',
    transform: [{ rotate: '-18deg' }],
  },
  backgroundBlobRight: {
    position: 'absolute',
    width: 300,
    height: 420,
    top: 245,
    right: -220,
    borderRadius: 170,
    backgroundColor: 'rgba(252,229,235,0.52)',
    transform: [{ rotate: '16deg' }],
  },
  backgroundBlobBottom: {
    position: 'absolute',
    width: 340,
    height: 310,
    bottom: -170,
    left: -140,
    borderRadius: 180,
    backgroundColor: 'rgba(255,240,242,0.70)',
    transform: [{ rotate: '28deg' }],
  },
  content: {
    flexGrow: 1,
    minHeight: 690,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    justifyContent: 'space-between',
  },
  contentCompact: {
    minHeight: 630,
    paddingTop: 7,
    paddingBottom: 14,
  },

  header: {
    minHeight: 58,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
    letterSpacing: -0.8,
    color: COLORS.navy,
  },

  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 41,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(255,255,255,0.76)',
    shadowColor: COLORS.tealDark,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.teal,
    marginRight: 10,
  },

  onlineText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.tealDark,
  },

  avatarStage: {
    height: 244,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarStageCompact: {
    height: 204,
  },
  avatarOuterGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(233,75,112,0.22)',
  },
  avatarHalo: {
    position: 'absolute',
    width: 202,
    height: 202,
    borderRadius: 101,
    borderWidth: 13,
    borderColor: 'rgba(201,31,70,0.16)',
  },
  avatarBorder: {
    width: 185,
    height: 185,
    borderRadius: 93,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  avatarInnerBorder: {
    width: 175,
    height: 175,
    borderRadius: 88,
    padding: 5,
    backgroundColor: COLORS.white,
  },
  avatar: {
    width: 165,
    height: 165,
    borderRadius: 83,
    backgroundColor: COLORS.mintSoft,
  },
  availabilityCard: {
    alignSelf: 'center',
    width: '86%',
    height: 177,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    paddingTop: 76,
    backgroundColor: 'rgba(255,255,255,0.78)',
    shadowColor: COLORS.tealDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 22,
    elevation: 2,
  },
  availabilityCardCompact: {
    height: 165,
    paddingTop: 68,
  },
  audioIconGlow: {
    position: 'absolute',
    top: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(252,229,235,0.86)',
    borderWidth: 5,
    borderColor: 'rgba(255,240,242,0.92)',
  },
  audioIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,245,246,0.96)',
  },
  audioBar: {
    width: 3,
    marginHorizontal: 2,
    borderRadius: 2,
    backgroundColor: COLORS.teal,
  },
  availableTitle: {
    color: COLORS.navy,
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  availableSubtitle: {
    marginTop: 4,
    color: COLORS.body,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  listeningBadge: {
    marginTop: 10,
    height: 32,
    paddingHorizontal: 17,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(252,229,235,0.90)',
  },
  listeningDot: {
    width: 10,
    height: 10,
    marginRight: 12,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  listeningText: {
    color: COLORS.tealDark,
    fontSize: 15,
    fontWeight: '800',
  },
  timer: {
    alignSelf: 'center',
    color: COLORS.navy,
    fontSize: 38,
    lineHeight: 47,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  offlineButtonTouch: {
    width: '100%',
    shadowColor: COLORS.tealDark,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  offlineButton: {
    height: 57,
    borderRadius: 29,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineText: {
    marginLeft: 13,
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 18,
  },
});

export default OnlineRoomScreen;
