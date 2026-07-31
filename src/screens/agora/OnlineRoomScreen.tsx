import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
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
  AppStateStatus,
} from 'react-native';

import { useIsFocused } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import Colors from '../../constants/colors';
import IncomingCallModal from './IncomingCallModal';
import { femaleAvatars } from '../../constants/constants';
import { useUser } from '../../hooks/UserContext';
import RoomService, { Room } from '../../firebase/RoomService';

const AVATAR = 'https://i.pravatar.cc/400?img=47';

type Props = {
  navigation: any;
};

const OnlineRoomScreen = ({ navigation }: Props) => {
  const { user, updateProfile } = useUser();
  const [incomingRoom, setIncomingRoom] = useState<Room | null>(null);
  const isFocused = useIsFocused();
  const pulse = useRef(new Animated.Value(0)).current;
  const appState = useRef(AppState.currentState);

  const [timer, setTimer] = useState('00:00:00');
  const [showIncoming, setShowIncoming] = useState(false);
  const [dots, setDots] = useState('.');

  const seconds = useRef(0);

  React.useEffect(() => {
    updateProfile({ status: 'online' });
  }, [isFocused]);

  React.useEffect(() => {
    const unsubscribe = RoomService.listenIncomingCall(user.uid, room => {
      if (!room) {
        return;
      }

      console.log('OnlineRoomScreen -> setShowIncoming', room.status);
      switch (room.status) {
        case 'ringing':
          setIncomingRoom(room);
          setShowIncoming(true);
          break;

        case 'men_rejected':
          setShowIncoming(false);
          break;

        case 'ended':
      }
    });

    const subscription = AppState.addEventListener(
      'change',
      async (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          await updateProfile({ status: 'online' });
        }
        appState.current = nextState;
      },
    );

    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    Animated.loop(
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
    ).start();

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

    const dotInterval = setInterval(() => {
      setDots(prev => {
        if (prev === '.') return '..';
        if (prev === '..') return '...';
        return '.';
      });
    }, 500);

    return () => {
      clearInterval(timerInterval);
      clearInterval(dotInterval);
    };
  }, []);

  const avatarScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.8],
  });

  const acceptCall = async () => {
    if (!incomingRoom) {
      Alert.alert('Error', 'No incoming call found.');
      return;
    }

    setShowIncoming(false);
    await RoomService.acceptCall(user?.profile?.uid);
    await updateProfile({
      status: 'busy',
    });
    navigation.replace('Call', {
      gender: 'female',
      userName: incomingRoom?.male?.name,
      avatarId: incomingRoom?.male?.avatarId,
      femaleUid: incomingRoom?.female?.uid,
      uid: incomingRoom?.roomId,
    });
  };

  const declineCall = async () => {
    setShowIncoming(false);

    try {
      await updateProfile({
        status: 'offline',
      });

      await RoomService.rejectCall(user?.uid);

      setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 50); // Adjust to 500-1000ms if needed
    } catch (e) {
      console.log('goOffline ->', e);

      Alert.alert('Error', 'Unable to update your status. Please try again.');
    }
  };

  const goOffline = () => {
    Alert.alert(
      'Go Offline',
      'Are you sure you want to go offline? You will not receive any calls from male users while you are offline.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Go Offline',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateProfile({
                status: 'offline',
              });
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
      <SafeAreaView style={styles.container}>
        <StatusBar
          backgroundColor={Colors.background}
          barStyle="dark-content"
        />

        {/* Header */}

        <View style={styles.header}>
          <Text style={styles.title}>Online Room</Text>

          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />

            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>

        {/* Avatar */}

        <View style={styles.avatarSection}>
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: glowOpacity,
                transform: [{ scale: avatarScale }],
              },
            ]}
          />

          <Animated.View
            style={{
              transform: [{ scale: avatarScale }],
            }}
          >
            <LinearGradient
              colors={Colors.goldGradient}
              style={styles.avatarBorder}
            >
              <Image
                source={femaleAvatars.at(0)?.image}
                style={styles.avatar}
              />
            </LinearGradient>
          </Animated.View>

          <Text style={styles.name}>You're available</Text>

          <Text style={styles.subtitle}>Waiting for incoming voice calls</Text>

          <Text style={styles.listening}>Listening{dots}</Text>

          <Text style={styles.timer}>{timer}</Text>
        </View>

        {/* Bottom */}

        <View style={styles.bottom}>
          <TouchableOpacity
            onPress={goOffline}
            activeOpacity={0.9}
            style={styles.offlineButton}
          >
            <MaterialCommunityIcons
              name="power"
              color={Colors.white}
              size={22}
            />

            <Text style={styles.offlineText}>Go Offline</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <IncomingCallModal
        visible={showIncoming}
        onAccept={acceptCall}
        onDecline={declineCall}
        onBlock={async () => {
          RoomService.blockUser(
            incomingRoom?.female?.uid || 'falseBlock',
            incomingRoom?.male?.uid || 'falseBlock',
          );
          await declineCall();
          Alert.alert(
            'Blocked Successfully',
            'The user has been added to your blocked list.',
          );
        }}
        onReport={async reason => {
          RoomService.reportUser(
            incomingRoom?.female?.uid || 'falseBlock',
            incomingRoom?.male?.uid || 'falseBlock',
            reason,
          );
          await declineCall();
          Alert.alert(
            'Report Submitted',
            'Your report has been received successfully and will be reviewed by our moderation team.',
          );
        }}
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
    backgroundColor: Colors.background,
  },

  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },

  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 3,
  },

  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    marginRight: 8,
  },

  onlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },

  avatarSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  glow: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#D4AF37',
    opacity: 0.18,
  },

  avatarBorder: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },

  avatar: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: Colors.surface,
  },

  name: {
    marginTop: 35,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },

  subtitle: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.subText,
    textAlign: 'center',
    lineHeight: 24,
  },

  listening: {
    marginTop: 35,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.secondary,
  },

  timer: {
    marginTop: 18,
    fontSize: 34,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 1,
  },

  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 35,
  },

  offlineButton: {
    height: 58,
    borderRadius: 18,
    backgroundColor: Colors.primary,

    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 6,
  },

  offlineText: {
    marginLeft: 10,
    color: Colors.white,
    fontWeight: '700',
    fontSize: 17,
  },
});

export default OnlineRoomScreen;
