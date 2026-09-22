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
  AppState,
  BackHandler,
  Vibration,
  useWindowDimensions,
} from 'react-native';

import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  ConnectionStateType,
  UserOfflineReasonType,
  LocalAudioStreamReason,
  LocalAudioStreamState,
} from 'react-native-agora';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';
import InCallManager from 'react-native-incall-manager';

import styles from './styles';
import {
  startCallRuntime,
  stopCallRuntime,
  setCallInterval,
} from '../../utils/callRuntime';
import Colors from '../../constants/colors';
import RoomService from '../../firebase/RoomService';
import {
  CALL_RATE_PER_MINUTE,
  getFemaleAvatar,
} from '../../constants/constants';
import { useUser } from '../../hooks/UserContext';

type Props = {
  route: { params: Record<string, any> };
  visible: boolean;
  onMinimize: () => void;
  onFinished: () => void;
  onAddBalance: () => void;
};

const LOW_BALANCE_MINUTES = 3;

const CallScreen = ({
  route,
  visible,
  onMinimize,
  onFinished,
  onAddBalance,
}: Props) => {
  const { user } = useUser();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const compactLayout = screenHeight < 700 || screenWidth < 360;
  useEffect(() => {
    if (!visible) return;
    InCallManager.setKeepScreenOn(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', state => {
      InCallManager.setKeepScreenOn(state === 'active');
    });
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      onMinimize();
      return true;
    });
    return () => {
      subscription.remove();
      back.remove();
      InCallManager.setKeepScreenOn(false);
    };
  }, [visible, onMinimize]);

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

  const timerRef = useRef<(() => void) | null>(null);
  const billingTimerRef = useRef<(() => void) | null>(null);
  const billingStartingRef = useRef(false);
  const peerRecoveryRef = useRef<(() => void) | null>(null);
  const callEndedRef = useRef(false);
  const lowBalanceAlertedRef = useRef(false);

  const seconds = useRef(0);

  const [status, setStatus] = useState('Connecting...');

  const [connected, setConnected] = useState(false);

  const [muted, setMuted] = useState(false);

  const [speaker, setSpeaker] = useState(true);

  const [safetyActionLoading, setSafetyActionLoading] = useState(false);

  const [timer, setTimer] = useState('00:00');

  const [callerBalance, setCallerBalance] = useState<number | null>(null);

  const [showLowBalance, setShowLowBalance] = useState(false);

  const walletBalance = Number(user?.wallet?.balance);
  const lowBalanceThreshold = CALL_RATE_PER_MINUTE * LOW_BALANCE_MINUTES;

  useEffect(() => {
    if (gender !== 'male' || !connected || !Number.isFinite(walletBalance)) {
      return;
    }

    if (walletBalance > lowBalanceThreshold) {
      lowBalanceAlertedRef.current = false;
      setShowLowBalance(false);
      return;
    }

    if (walletBalance <= 0 || lowBalanceAlertedRef.current) {
      return;
    }

    lowBalanceAlertedRef.current = true;
    setShowLowBalance(true);
    Vibration.vibrate([0, 400, 200, 400]);
  }, [connected, gender, lowBalanceThreshold, walletBalance]);

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

    const startedAt = Date.now();
    timerRef.current = setCallInterval(() => {
      seconds.current = Math.floor((Date.now() - startedAt) / 1000);

      const min = Math.floor(seconds.current / 60);
      const sec = seconds.current % 60;

      setTimer(
        `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`,
      );
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      timerRef.current();
      timerRef.current = null;
    }

    seconds.current = 0;

    setTimer('00:00');
  }, []);

  const stopBilling = useCallback(() => {
    if (billingTimerRef.current) {
      billingTimerRef.current();
      billingTimerRef.current = null;
    }
  }, []);

  const finishCall = useCallback(
    async (updateRoom = true) => {
      if (callEndedRef.current) {
        return;
      }

      callEndedRef.current = true;
      peerRecoveryRef.current?.();
      peerRecoveryRef.current = null;
      stopBilling();
      stopTimer();

      const rtcEngine = engine.current;
      engine.current = null;
      rtcEngine?.leaveChannel();
      rtcEngine?.release();
      stopCallRuntime();

      onFinished();

      if (updateRoom && femaleUid) {
        try {
          await RoomService.endCall(femaleUid);
        } catch (error) {
          console.error('Unable to update ended call:', error);
        }
      }
    },
    [femaleUid, onFinished, stopBilling, stopTimer],
  );

  const endForInsufficientBalance = useCallback(async () => {
    if (callEndedRef.current) {
      return;
    }

    const ending = finishCall();
    Alert.alert(
      'Balance Exhausted',
      'Your wallet balance is insufficient to continue this call.',
      [{ text: 'OK' }],
    );
    await ending;
  }, [finishCall]);

  const startBilling = useCallback(async () => {
    if (
      gender !== 'male' ||
      callEndedRef.current ||
      billingTimerRef.current ||
      billingStartingRef.current
    ) {
      return;
    }

    billingStartingRef.current = true;

    try {
      const firstMinuteCharged = await RoomService.chargeCallMinute(femaleUid);

      if (callEndedRef.current) {
        return;
      }

      if (!firstMinuteCharged) {
        await endForInsufficientBalance();
        return;
      }

      billingTimerRef.current = setCallInterval(async () => {
        if (callEndedRef.current || peerRecoveryRef.current) return;
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

    if (callEndedRef.current) {
      return;
    }

    if (!permission) {
      Alert.alert('Permission', 'Microphone permission required.');
      await finishCall();
      return;
    }

    try {
      await startCallRuntime();
    } catch (error) {
      console.error('Unable to start background call service:', error);
      Alert.alert(
        'Unable to start call',
        'Please reopen VoiceTamil and try again.',
      );
      await finishCall();
      return;
    }
    if (callEndedRef.current) {
      stopCallRuntime();
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
        if (callEndedRef.current) {
          return;
        }
        peerRecoveryRef.current?.();
        peerRecoveryRef.current = null;
        setConnected(true);

        setStatus('Connected');

        startTimer();

        await RoomService.callConnected(femaleUid);
        await startBilling();
      },

      onUserOffline: (_connection, _remoteUid, reason) => {
        if (reason === UserOfflineReasonType.UserOfflineQuit) {
          finishCall();
        } else {
          setStatus('Waiting for the other user to reconnect...');
          if (!peerRecoveryRef.current) {
            peerRecoveryRef.current = setCallInterval(async () => {
              peerRecoveryRef.current?.();
              peerRecoveryRef.current = null;
              await finishCall();
            }, 120000);
          }
        }
      },

      onLocalAudioStateChanged: (_connection, state, reason) => {
        if (callEndedRef.current) return;
        if (
          reason === LocalAudioStreamReason.LocalAudioStreamReasonInterrupted ||
          reason === LocalAudioStreamReason.LocalAudioStreamReasonDeviceBusy
        ) {
          setStatus('Audio interrupted — call is still connected');
        } else if (
          state === LocalAudioStreamState.LocalAudioStreamStateRecording ||
          state === LocalAudioStreamState.LocalAudioStreamStateEncoding
        ) {
          setStatus('Connected');
        }
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
            if (!callEndedRef.current) setStatus('Reconnecting...');
            break;

          case ConnectionStateType.ConnectionStateFailed:
            finishCall();
            break;
        }
      },
    });

    engine.current = rtcEngine;

    if (!token || uid === undefined) {
      Alert.alert('Call Error', 'Unable to initialize the call.');
      await finishCall();
      return;
    }

    rtcEngine.joinChannel(token, channelName, uid, {
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    });
  }, [
    channelName,
    femaleUid,
    finishCall,
    requestPermission,
    startTimer,
    startBilling,
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
          await finishCall();
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
              await finishCall();
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
    callEndedRef.current = false;
    initializeAgora().catch(async error => {
      console.error('Unable to initialize call:', error);
      await finishCall();
    });

    return () => {
      callEndedRef.current = true;
      peerRecoveryRef.current?.();
      peerRecoveryRef.current = null;
      stopTimer();
      stopBilling();
      stopCallRuntime();

      if (engine.current) {
        engine.current.leaveChannel();
        engine.current.release();
        engine.current = null;
      }
    };
  }, [finishCall, initializeAgora, stopBilling, stopTimer]);

  useEffect(() => {
    if (!femaleUid) {
      return;
    }

    return RoomService.listenCallStatus(femaleUid, room => {
      if (
        !room ||
        ['ended', 'waiting', 'offline', 'rejected', 'men_rejected'].includes(
          room.status,
        )
      ) {
        finishCall(false);
      }
    });
  }, [femaleUid, finishCall]);

  return (
    <LinearGradient
      colors={[Colors.darkBackground, Colors.darkBackgroundAlt]}
      style={styles.container}
    >
      {visible && (
        <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      )}
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, compactLayout && styles.headerCompact]}>
          <TouchableOpacity
            onPress={onMinimize}
            accessibilityLabel="Minimize call"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={26}
              color={Colors.white}
            />
          </TouchableOpacity>

          <Text
            style={[
              styles.headerTitle,
              compactLayout && styles.headerTitleCompact,
            ]}
          >
            Encrypted Voice Call
          </Text>

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

        <View
          style={[
            styles.avatarContainer,
            compactLayout && styles.avatarContainerCompact,
          ]}
        >
          <View
            style={[
              styles.avatarOuter,
              compactLayout && styles.avatarOuterCompact,
            ]}
          >
            <Image
              source={
                gender === 'male'
                  ? getFemaleAvatar(avatarId)
                  : require('../../assets/man.png')
              }
              style={[styles.avatar, compactLayout && styles.avatarCompact]}
            />
          </View>

          <Text
            numberOfLines={1}
            style={[styles.name, compactLayout && styles.nameCompact]}
          >
            {displayName}
          </Text>

          {showEnglishName && (
            <Text
              numberOfLines={1}
              style={[
                styles.englishName,
                compactLayout && styles.englishNameCompact,
              ]}
            >
              {englishName}
            </Text>
          )}
          <View
            style={[
              styles.statusContainer,
              compactLayout && styles.statusContainerCompact,
            ]}
          >
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
            <View
              style={[
                styles.callerBalance,
                compactLayout && styles.callerBalanceCompact,
              ]}
            >
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

          {gender === 'male' && (
            <View
              style={[
                styles.callerBalance,
                compactLayout && styles.callerBalanceCompact,
              ]}
            >
              <MaterialCommunityIcons
                name="wallet-outline"
                size={16}
                color={Colors.secondary}
              />

              <Text style={styles.callerBalanceLabel}>Your balance</Text>

              <Text style={styles.callerBalanceValue}>
                ₹{Number.isFinite(walletBalance) ? walletBalance : '--'}
              </Text>
            </View>
          )}

          {gender === 'female' && (
            <Text
              style={[
                styles.callDurationLabel,
                compactLayout && styles.callDurationLabelCompact,
              ]}
            >
              Current call time
            </Text>
          )}

          <Text style={[styles.timer, compactLayout && styles.timerCompact]}>
            {timer}
          </Text>
        </View>

        {gender === 'male' && showLowBalance && (
          <View
            style={[
              styles.lowBalancePopup,
              compactLayout && styles.lowBalancePopupCompact,
            ]}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            <Ionicons name="wallet-sharp" size={24} color={Colors.secondary} />
            <View style={styles.lowBalanceCopy}>
              <Text style={styles.lowBalanceTitle}>3 minutes or less left</Text>
              <Text style={styles.lowBalanceMessage}>
                Add balance to keep this call going.
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Add balance"
              style={styles.addBalanceButton}
              onPress={onAddBalance}
            >
              <Text style={styles.addBalanceText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Dismiss low balance alert"
              style={styles.dismissBalanceButton}
              onPress={() => setShowLowBalance(false)}
            >
              <MaterialCommunityIcons
                name="close"
                size={18}
                color={Colors.darkTextMuted}
              />
            </TouchableOpacity>
          </View>
        )}

        <View
          style={[styles.controls, compactLayout && styles.controlsCompact]}
        >
          <View style={[styles.row, compactLayout && styles.rowCompact]}>
            {/* Speaker */}

            <View style={styles.controlItem}>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  compactLayout && styles.controlButtonCompact,
                  speaker && {
                    backgroundColor: Colors.secondary,
                  },
                ]}
                activeOpacity={0.8}
                onPress={toggleSpeaker}
              >
                <MaterialCommunityIcons
                  name={speaker ? 'volume-high' : 'volume-off'}
                  size={compactLayout ? 25 : 30}
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
                  compactLayout && styles.controlButtonCompact,
                  muted && {
                    backgroundColor: Colors.secondary,
                  },
                ]}
                activeOpacity={0.8}
                onPress={toggleMute}
              >
                <MaterialCommunityIcons
                  name={muted ? 'microphone-off' : 'microphone'}
                  size={compactLayout ? 25 : 30}
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
            style={[
              styles.endButton,
              compactLayout && styles.endButtonCompact,
            ]}
            onPress={leaveCall}
          >
            <MaterialCommunityIcons
              name="phone-hangup"
              size={compactLayout ? 32 : 40}
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
