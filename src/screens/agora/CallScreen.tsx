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
import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';

import styles from './styles';
import Colors from '../../constants/colors';
import RoomService from '../../firebase/RoomService';
import { getFemaleAvatar } from '../../constants/constants';

type Props = {
  navigation: any;
  route: any;
};

const CallScreen = ({ navigation, route }: Props) => {
  const {
    channelName = 'voice_tamil',
    userName = 'N/A',
    tamilName: routeTamilName,
    avatarId = 1,
    gender = 'male',
    femaleUid,
    maleUid,
    agora,
  } = route?.params ?? {};

  const token = gender === 'male' ? agora?.male?.token : agora?.female?.token;
  const uid = gender === 'male' ? agora?.male?.uid : agora?.female?.uid;
  const tamilName = String(routeTamilName || '').trim();
  const englishName = String(userName || '').trim();
  const displayName =
    gender === 'male'
      ? tamilName || englishName || 'N/A'
      : englishName || 'N/A';
  const showEnglishName = Boolean(
    gender === 'male' && tamilName && englishName && tamilName !== englishName,
  );

  const engine = useRef<IRtcEngine | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const billingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const billingStartingRef = useRef(false);

  const seconds = useRef(0);

  const [status, setStatus] = useState('Connecting...');

  const [connected, setConnected] = useState(false);

  const [muted, setMuted] = useState(false);

  const [speaker, setSpeaker] = useState(true);

  const [safetyActionLoading, setSafetyActionLoading] = useState(false);

  const [timer, setTimer] = useState('00:00');

  const [callerBalance, setCallerBalance] = useState<number | null>(null);

  useEffect(() => {
    if (gender !== 'female' || !maleUid) {
      setCallerBalance(null);
      return;
    }

    const balanceRef = database().ref(`users/${maleUid}/wallet/balance`);
    const listener = balanceRef.on('value', snapshot => {
      const balance = Number(snapshot.val());

      setCallerBalance(Number.isFinite(balance) ? Math.max(0, balance) : 0);
    });

    return () => {
      balanceRef.off('value', listener);
    };
  }, [gender, maleUid]);

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
    if (timerRef.current) {
      return;
    }

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
      timerRef.current = null;
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

      onUserJoined: async () => {
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

  const reportUser = (reason: string) => {
    if (!connected) {
      return;
    }

    const reporterUid = auth().currentUser?.uid;
    const reportedUid = gender === 'male' ? femaleUid : maleUid;

    if (!reporterUid || !reportedUid) {
      Alert.alert(
        'Unable to Report',
        'The other user could not be identified.',
      );
      return;
    }

    RoomService.reportUser(reporterUid, reportedUid, reason)
      .then(() => {
        Alert.alert(
          'Report Submitted',
          'Your report has been received and will be reviewed by our moderation team.',
        );
      })
      .catch(() => {
        Alert.alert('Unable to Report', 'Please try again.');
      });
  };

  const showReportOptions = () => {
    if (!connected) {
      return;
    }

    Alert.alert('Report User', 'Choose a reason for this report.', [
      {
        text: 'Harassment',
        onPress: () => reportUser('Harassment'),
      },
      {
        text: 'Inappropriate behaviour',
        onPress: () => reportUser('Inappropriate behaviour'),
      },
      {
        text: 'Other',
        onPress: () => reportUser('Other'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const blockUser = () => {
    if (!connected) {
      return;
    }

    const blockerUid = auth().currentUser?.uid;
    const blockedUid = gender === 'male' ? femaleUid : maleUid;

    if (!blockerUid || !blockedUid) {
      Alert.alert('Unable to Block', 'The other user could not be identified.');
      return;
    }

    Alert.alert(
      'Block User',
      `Block ${displayName}? You will no longer be able to call each other.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setSafetyActionLoading(true);

            try {
              await RoomService.blockUser(blockerUid, blockedUid);
              stopTimer();
              stopBilling();

              if (engine.current) {
                engine.current.leaveChannel();
                engine.current.release();
                engine.current = null;
              }

              await RoomService.endCall(femaleUid);
              navigation.goBack();
            } catch {
              Alert.alert('Unable to Block', 'Please try again.');
              setSafetyActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const showSafetyOptions = () => {
    if (!connected || safetyActionLoading) {
      return;
    }

    Alert.alert(
      'Safety Options',
      `Manage your interaction with ${displayName}.`,
      [
        { text: 'Report User', onPress: showReportOptions },
        { text: 'Block User', style: 'destructive', onPress: blockUser },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
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
    <LinearGradient
      colors={[Colors.darkBackground, Colors.darkBackgroundAlt]}
      style={styles.container}
    >
      <StatusBar backgroundColor={Colors.primary} barStyle={'light-content'} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={leaveCall}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={26}
              color={Colors.white}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Encrypted Voice Call</Text>

          {connected ? (
            <TouchableOpacity
              accessibilityLabel="Safety options"
              accessibilityRole="button"
              disabled={safetyActionLoading}
              onPress={showSafetyOptions}
            >
              <MaterialCommunityIcons
                name={safetyActionLoading ? 'loading' : 'shield-alert-outline'}
                size={25}
                color={Colors.secondary}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.safetyPlaceholder} />
          )}
        </View>

        <View style={styles.avatarContainer}>
          <View style={styles.avatarOuter}>
            <Image
              source={
                gender === 'male'
                  ? getFemaleAvatar(avatarId)
                  : require('../../assets/man.png')
              }
              style={styles.avatar}
            />
          </View>

          <Text style={styles.name}>{displayName}</Text>

          {showEnglishName && (
            <Text style={styles.englishName}>{englishName}</Text>
          )}
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: connected
                    ? Colors.online
                    : Colors.connectionWarning,
                },
              ]}
            />

            <Text style={styles.status}>{status}</Text>
          </View>

          {gender === 'female' && (
            <View style={styles.callerBalance}>
              <MaterialCommunityIcons
                name="wallet-outline"
                size={16}
                color={Colors.secondary}
              />

              <Text style={styles.callerBalanceLabel}>Caller balance</Text>

              <Text style={styles.callerBalanceValue}>
                ₹{callerBalance ?? '--'}
              </Text>
            </View>
          )}

          {gender === 'female' && (
            <Text style={styles.callDurationLabel}>Current call time</Text>
          )}

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
                    backgroundColor: Colors.secondary,
                  },
                ]}
                activeOpacity={0.8}
                onPress={toggleSpeaker}
              >
                <MaterialCommunityIcons
                  name={speaker ? 'volume-high' : 'volume-off'}
                  size={30}
                  color={speaker ? Colors.darkBackground : Colors.white}
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
                    backgroundColor: Colors.secondary,
                  },
                ]}
                activeOpacity={0.8}
                onPress={toggleMute}
              >
                <MaterialCommunityIcons
                  name={muted ? 'microphone-off' : 'microphone'}
                  size={30}
                  color={muted ? Colors.darkBackground : Colors.white}
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
              color={Colors.white}
            />
          </TouchableOpacity>

          <Text style={styles.endText}>End Call</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default CallScreen;
