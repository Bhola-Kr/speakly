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
} from 'react-native';

import { useIsFocused } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import Colors from '../../constants/colors';
import IncomingCallModal from './IncomingCallModal';
import { femaleAvatars } from '../../constants/constants';
import { useUser } from '../../hooks/UserContext';

const AVATAR = 'https://i.pravatar.cc/400?img=47';

type Props = {
  navigation: any;
};

const OnlineRoomScreen = ({ navigation }: Props) => {
  const { updateProfile } = useUser();
  const isFocused = useIsFocused();
  const pulse = useRef(new Animated.Value(0)).current;

  const [timer, setTimer] = useState('00:00:00');
  const [showIncoming, setShowIncoming] = useState(false);
  const [dots, setDots] = useState('.');

  const seconds = useRef(0);

  React.useEffect(() => {
    updateProfile({ status: 'Online' });
  }, [isFocused]);

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

    // Demo incoming call after 8 seconds
    const incoming = setTimeout(() => {
      setShowIncoming(true);
    }, 8000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(dotInterval);
      clearTimeout(incoming);
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

  const acceptCall = () => {
    setShowIncoming(false);

    navigation.navigate('Call', {
      userName: 'Rahul',
      city: 'Chennai',
      avatar: AVATAR,
    });
  };

  const declineCall = () => {
    setShowIncoming(false);
  };

  const goOffline = async () => {
    try {
      await updateProfile({ status: 'Offline' });
      navigation.goBack();
    } catch (e) {
      console.log('goOnLine -> e', e);
    }
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
        userName="Rahul"
        city="Chennai"
        age={20}
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
