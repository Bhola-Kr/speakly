import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Image,
  Alert,
} from 'react-native';

import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  ConnectionStateType,
} from 'react-native-agora';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

import styles from './styles';

type Props = {
  navigation: any;
  route: any;
};

const CallScreen = ({ navigation, route }: Props) => {
  const {
    token = '',
    channelName = 'test_channel',
    uid = Math.floor(Math.random() * 100000),
    userName = 'Aadhilakshmi',
    city = 'Chennai',
    avatar = 'https://i.pravatar.cc/300?img=47',
  } = route?.params ?? {};

  const engine = useRef<IRtcEngine | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const seconds = useRef(0);

  const [status, setStatus] = useState('Connecting...');

  const [connected, setConnected] = useState(false);

  const [muted, setMuted] = useState(false);

  const [speaker, setSpeaker] = useState(true);

  const [timer, setTimer] = useState('00:00');

  const requestPermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      seconds.current++;

      const min = Math.floor(seconds.current / 60);
      const sec = seconds.current % 60;

      setTimer(
        `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`,
      );
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    seconds.current = 0;

    setTimer('00:00');
  };

  const initializeAgora = async () => {
    const permission = await requestPermission();

    if (!permission) {
      Alert.alert('Permission', 'Microphone permission required.');
      navigation.goBack();
      return;
    }

    const rtcEngine = createAgoraRtcEngine();

    rtcEngine.initialize({
      appId: 'YOUR_AGORA_APP_ID', // Replace with your Agora App ID
    });

    rtcEngine.enableAudio();

    rtcEngine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);

    rtcEngine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

    rtcEngine.setEnableSpeakerphone(true);

    rtcEngine.registerEventHandler({
      onJoinChannelSuccess: () => {
        setStatus('Waiting for user...');
      },

      onUserJoined: (_connection, remoteUid) => {
        console.log('Remote Joined', remoteUid);

        setConnected(true);

        setStatus('Connected');

        startTimer();
      },

      onUserOffline: () => {
        setConnected(false);

        setStatus('User Left');

        stopTimer();
      },

      onConnectionStateChanged: (_connection, state: ConnectionStateType) => {
        switch (state) {
          case ConnectionStateType.ConnectionStateConnecting:
            setStatus('Connecting...');
            break;

          case ConnectionStateType.ConnectionStateConnected:
            setStatus('Connected');
            break;

          case ConnectionStateType.ConnectionStateReconnecting:
            setStatus('Reconnecting...');
            break;

          case ConnectionStateType.ConnectionStateDisconnected:
            setStatus('Disconnected');
            break;
        }
      },
    });

    engine.current = rtcEngine;

    await rtcEngine.joinChannel(token, channelName, uid, {
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    });
  };

  const leaveCall = () => {
    Alert.alert('End Call', 'Are you sure you want to end this call?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'End',
        style: 'destructive',
        onPress: async () => {
          stopTimer();

          if (engine.current) {
            await engine.current.leaveChannel();
            engine.current.release();
            engine.current = null;
          }

          navigation.goBack();
        },
      },
    ]);
  };

  const toggleMute = () => {
    const value = !muted;

    setMuted(value);

    engine.current?.muteLocalAudioStream(value);
  };

  const toggleSpeaker = () => {
    const value = !speaker;

    setSpeaker(value);

    engine.current?.setEnableSpeakerphone(value);
  };

  useEffect(() => {
    initializeAgora();

    return () => {
      stopTimer();

      if (engine.current) {
        engine.current.leaveChannel();
        engine.current.release();
      }
    };
  }, []);

  return (
    <LinearGradient colors={['#111111', '#181818']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={leaveCall}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={26}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Encrypted Voice Call</Text>

          <MaterialCommunityIcons
            name="shield-check"
            size={24}
            color="#D4AF37"
          />
        </View>

        <View style={styles.avatarContainer}>
          <View style={styles.avatarOuter}>
            <Image source={{ uri: avatar }} style={styles.avatar} />
          </View>

          <Text style={styles.name}>{userName}</Text>

          <Text style={styles.city}>{city}</Text>

          <View style={styles.statusContainer}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: connected ? '#00E676' : '#FFC107',
                },
              ]}
            />

            <Text style={styles.status}>{status}</Text>
          </View>

          <Text style={styles.timer}>{timer}</Text>

          <View style={styles.wallet}>
            <View style={styles.walletItem}>
              <Text style={styles.walletTitle}>Balance</Text>

              <Text style={styles.walletValue}>₹220</Text>
            </View>

            <View style={styles.walletItem}>
              <Text style={styles.walletTitle}>Rate</Text>

              <Text style={styles.walletValue}>₹4/min</Text>
            </View>

            <View style={styles.walletItem}>
              <Text style={styles.walletTitle}>Remaining</Text>

              <Text style={styles.walletValue}>55 min</Text>
            </View>
          </View>
        </View>

        <View style={styles.controls}>
          <View style={styles.row}>
            {/* Speaker */}

            <View style={styles.controlItem}>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  speaker && {
                    backgroundColor: '#D4AF37',
                  },
                ]}
                activeOpacity={0.8}
                onPress={toggleSpeaker}
              >
                <MaterialCommunityIcons
                  name={speaker ? 'volume-high' : 'volume-off'}
                  size={30}
                  color={speaker ? '#111111' : '#FFFFFF'}
                />
              </TouchableOpacity>

              <Text style={styles.controlText}>Speaker</Text>
            </View>

            {/* Mute */}

            <View style={styles.controlItem}>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  muted && {
                    backgroundColor: '#D4AF37',
                  },
                ]}
                activeOpacity={0.8}
                onPress={toggleMute}
              >
                <MaterialCommunityIcons
                  name={muted ? 'microphone-off' : 'microphone'}
                  size={30}
                  color={muted ? '#111111' : '#FFFFFF'}
                />
              </TouchableOpacity>

              <Text style={styles.controlText}>
                {muted ? 'Unmute' : 'Mute'}
              </Text>
            </View>
          </View>

          {/* End Call */}

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.endButton}
            onPress={leaveCall}
          >
            <MaterialCommunityIcons
              name="phone-hangup"
              size={40}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <Text style={styles.endText}>End Call</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default CallScreen;
