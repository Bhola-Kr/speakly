import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Image,
  Alert,
  StatusBar,
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
import Colors from '../../constants/colors';
import RoomService from '../../firebase/RoomService';
import { femaleAvatars } from '../../constants/constants';

type Props = {
  navigation: any;
  route: any;
};

const CallScreen = ({ navigation, route }: Props) => {
  const {
    channelName = 'voice_tamil',
    userName = 'N/A',
    avatarId = 1,
    gender = 'male',
    femaleUid,
    agora,
  } = route?.params ?? {};

  const token = gender === 'male' ? agora?.male?.token : agora?.female?.token;
  const uid = gender === 'male' ? agora?.male?.uid : agora?.female?.uid;

  const engine = useRef<IRtcEngine | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const billingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const billingStartingRef = useRef(false);

  const seconds = useRef(0);

  const [status, setStatus] = useState('Connecting...');

  const [connected, setConnected] = useState(false);

  const [muted, setMuted] = useState(false);

  const [speaker, setSpeaker] = useState(true);

  const [timer, setTimer] = useState('00:00');

  const requestPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }, []);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      seconds.current++;

      const min = Math.floor(seconds.current / 60);
      const sec = seconds.current % 60;

      setTimer(
        `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`,
      );
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    seconds.current = 0;

    setTimer('00:00');
  }, []);

  const stopBilling = useCallback(() => {
    if (billingTimerRef.current) {
      clearInterval(billingTimerRef.current);
      billingTimerRef.current = null;
    }
  }, []);

  const endForInsufficientBalance = useCallback(async () => {
    stopBilling();
    stopTimer();

    if (engine.current) {
      engine.current.leaveChannel();
      engine.current.release();
      engine.current = null;
    }

    await RoomService.endCall(femaleUid);
    Alert.alert(
      'Balance Exhausted',
      'Your wallet balance is insufficient to continue this call.',
      [{ text: 'Add Balance', onPress: () => navigation.replace('Wallet') }],
    );
  }, [femaleUid, navigation, stopBilling, stopTimer]);

  const startBilling = useCallback(async () => {
    if (
      gender !== 'male' ||
      billingTimerRef.current ||
      billingStartingRef.current
    ) {
      return;
    }

    billingStartingRef.current = true;

    try {
      const firstMinuteCharged = await RoomService.chargeCallMinute(femaleUid);

      if (!firstMinuteCharged) {
        await endForInsufficientBalance();
        return;
      }

      billingTimerRef.current = setInterval(async () => {
        const nextMinuteCharged = await RoomService.chargeCallMinute(femaleUid);

        if (!nextMinuteCharged) {
          await endForInsufficientBalance();
        }
      }, 60 * 1000);
    } finally {
      billingStartingRef.current = false;
    }
  }, [endForInsufficientBalance, femaleUid, gender]);

  const initializeAgora = useCallback(async () => {
    const permission = await requestPermission();

    if (!permission) {
      Alert.alert('Permission', 'Microphone permission required.');
      navigation.goBack();
      return;
    }

    const rtcEngine = createAgoraRtcEngine();

    rtcEngine.initialize({
      appId: 'f6bec5b940ea4b11af21f3b931f73536', // Replace with your Agora App ID
    });

    rtcEngine.enableAudio();

    rtcEngine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);

    rtcEngine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

    rtcEngine.setEnableSpeakerphone(true);

    rtcEngine.registerEventHandler({
      onJoinChannelSuccess: () => {
        setStatus('Waiting for user...');
      },

      onUserJoined: async (_connection, remoteUid) => {
        console.log('Remote Joined', remoteUid);

        setConnected(true);

        setStatus('Connected');

        startTimer();

        await RoomService.callConnected(femaleUid);
        await startBilling();
      },

      onUserOffline: () => {
        setConnected(false);

        setStatus('User Left');

        stopTimer();
        stopBilling();
        RoomService.endCall(femaleUid);
        navigation.goBack();
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

    if (!token || uid === undefined) {
      Alert.alert('Call Error', 'Unable to initialize the call.');
      navigation.goBack();
      return;
    }

    rtcEngine.joinChannel(token, channelName, uid, {
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    });
  }, [
    channelName,
    femaleUid,
    navigation,
    requestPermission,
    startTimer,
    startBilling,
    stopBilling,
    stopTimer,
    token,
    uid,
  ]);

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
          stopBilling();

          if (engine.current) {
            engine.current.leaveChannel();
            engine.current.release();
            engine.current = null;
          }

          await RoomService.endCall(femaleUid);
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
      stopBilling();

      if (engine.current) {
        engine.current.leaveChannel();
        engine.current.release();
        engine.current = null;
      }
    };
  }, [initializeAgora, stopBilling, stopTimer]);

  return (
    <LinearGradient colors={['#111111', '#181818']} style={styles.container}>
      <StatusBar backgroundColor={Colors.primary} barStyle={'light-content'} />
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
            <Image
              source={
                gender === 'male'
                  ? femaleAvatars.at(avatarId)?.image
                  : require('../../assets/man.png')
              }
              style={styles.avatar}
            />
          </View>

          <Text style={styles.name}>{userName}</Text>
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
