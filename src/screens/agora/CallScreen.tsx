import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Image,
  Alert,
  StatusBar,
  BackHandler,
  Vibration,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import LinearGradient from 'react-native-linear-gradient';
import auth from '@react-native-firebase/auth';
import { scopedDatabase as database } from '../../firebase/firebase';
import InCallManager from 'react-native-incall-manager';

import styles from './styles';
import {
  startCallRuntime,
  stopCallRuntime,
  setCallInterval,
} from '../../utils/callRuntime';
import Colors from '../../constants/colors';
import { copy } from '../../constants/strings';
import RoomService from '../../firebase/RoomService';
import {
  getFemaleAvatar,
  getMaleAvatar,
  getUserAvatar,
  normalizeCallRate,
} from '../../constants/constants';
import { useUser } from '../../hooks/UserContext';
import { trackCallStarted } from '../../firebase/analytics';

type Props = {
  route: { params: Record<string, any> };
  visible: boolean;
  onMinimize: () => void;
  onFinished: () => void;
};

const LOW_BALANCE_MINUTES = 3;
const BILLING_INTERVAL_MS = 60 * 1000;

const CallScreen = ({ route, visible, onMinimize, onFinished }: Props) => {
  const { user } = useUser();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const compactLayout = screenHeight < 700 || screenWidth < 360;

  useEffect(() => {
    InCallManager.start({ media: 'audio', auto: true });

    return () => {
      InCallManager.stop();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      onMinimize();
      return true;
    });
    return () => {
      back.remove();
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
    callId,
    maleGender,
    expertGender,
    callRatePerMinute: routeCallRate,
    agora,
  } = route?.params ?? {};
  const callRatePerMinute = normalizeCallRate(routeCallRate);

  const token = gender === 'male' ? agora?.male?.token : agora?.female?.token;
  const uid = gender === 'male' ? agora?.male?.uid : agora?.female?.uid;
  const isCaller = gender === 'male';
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
  const billingChargeInProgressRef = useRef(false);
  const peerRecoveryRef = useRef<(() => void) | null>(null);
  const callEndedRef = useRef(false);
  const callStartedTrackedRef = useRef(false);
  const countdownAlertedRef = useRef(false);
  const connectedRef = useRef(false);

  const seconds = useRef(0);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [status, setStatus] = useState<string>(copy.call.connecting);

  const [connected, setConnected] = useState(false);

  const [billingStarted, setBillingStarted] = useState(false);

  const [muted, setMuted] = useState(false);

  const [speaker, setSpeaker] = useState(false);

  const [safetyActionLoading, setSafetyActionLoading] = useState(false);

  const [callerBalance, setCallerBalance] = useState<number | null>(null);
  const [freeCallEndsAt, setFreeCallEndsAt] = useState(0);
  const [showFreeCallModal, setShowFreeCallModal] = useState(false);
  const [freeCallMinutes, setFreeCallMinutes] = useState(2);

  const walletBalance = Number(user?.wallet?.balance);
  const displayedBalance =
    gender === 'male'
      ? Number.isFinite(walletBalance)
        ? Math.max(0, walletBalance)
        : null
      : callerBalance;
  const freeCallSecondsRemaining = Math.max(
    0,
    Math.ceil((freeCallEndsAt - Date.now()) / 1000),
  );
  const estimatedMinutesRemaining =
    freeCallSecondsRemaining > 0
      ? Math.ceil(freeCallSecondsRemaining / 60)
      : displayedBalance === null
        ? null
        : Math.floor(displayedBalance / callRatePerMinute) +
          (billingStarted ? 1 : 0);
  const countdownBalance = gender === 'male' ? walletBalance : callerBalance;

  useEffect(() => {
    if (!connected || gender !== 'male' || !user?.uid || !user?.offers?.signupOffer?.claimedAt || !femaleUid) return;
    let cancelled = false;
    const configureFirstFreeCall = async () => {
      const [historySnapshot, minutesSnapshot, roomSnapshot] = await Promise.all([
        database().ref(`callHistory/${user.uid}`).once('value'),
        database().ref('configs/firstCallFreeMinutes').once('value'),
        database().ref(`rooms/${femaleUid}`).once('value'),
      ]);
      if (cancelled) return;
      const history = historySnapshot.val() || {};
      const hasCompletedCall = Object.values(history).some((item: any) => item?.status === 'Completed');
      if (hasCompletedCall) return;
      const configured = Number(minutesSnapshot.val());
      const minutes = Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 2;
      const room = roomSnapshot.val();
      const startedAt = Number(room?.callStartedAt || Date.now());
      setFreeCallMinutes(minutes);
      setFreeCallEndsAt(startedAt + minutes * BILLING_INTERVAL_MS);
      setShowFreeCallModal(true);
    };
    configureFirstFreeCall().catch(error => console.warn('Unable to load first-call free limit:', error));
    return () => { cancelled = true; };
  }, [connected, femaleUid, gender, user?.offers?.signupOffer?.claimedAt, user?.uid]);

  useEffect(() => {
    if (
      !connected ||
      !billingStarted ||
      countdownBalance === null ||
      !Number.isFinite(countdownBalance)
    ) {
      return;
    }

    // The current minute is already paid. Two further payable minutes means
    // the call has three minutes remaining, including the current minute.
    const countdownThreshold = callRatePerMinute * (LOW_BALANCE_MINUTES - 1);
    if (countdownBalance > countdownThreshold) {
      countdownAlertedRef.current = false;
      return;
    }

    if (!countdownAlertedRef.current) {
      countdownAlertedRef.current = true;
      Vibration.vibrate([0, 400, 200, 400]);
    }
  }, [billingStarted, callRatePerMinute, connected, countdownBalance]);

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

  const startTimer = useCallback((startedAt = Date.now()) => {
    if (timerRef.current) {
      return;
    }

    seconds.current = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    setElapsedSeconds(seconds.current);
    timerRef.current = setCallInterval(() => {
      seconds.current = Math.floor((Date.now() - startedAt) / 1000);
      setElapsedSeconds(seconds.current);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      timerRef.current();
      timerRef.current = null;
    }

    seconds.current = 0;
    setElapsedSeconds(0);
  }, []);

  const formatCallTime = (totalSeconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;

    return hours > 0
      ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
          2,
          '0',
        )}:${String(secs).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const displayedCallTime = elapsedSeconds;
  const callTimerReady = connected;

  const stopBilling = useCallback(() => {
    if (billingTimerRef.current) {
      billingTimerRef.current();
      billingTimerRef.current = null;
    }
  }, []);

  const pauseBilling = useCallback(() => {
    stopBilling();
    setBillingStarted(false);
  }, [stopBilling]);

  const finishCall = useCallback(
    async (updateRoom = true) => {
      if (callEndedRef.current) {
        return;
      }

      callEndedRef.current = true;
      peerRecoveryRef.current?.();
      peerRecoveryRef.current = null;
      pauseBilling();
      stopTimer();

      const rtcEngine = engine.current;
      engine.current = null;
      rtcEngine?.leaveChannel();
      rtcEngine?.release();
      stopCallRuntime();

      if (callId) {
        const participantUid =
          gender === 'male' ? auth().currentUser?.uid : femaleUid;
        if (participantUid) {
          RoomService.stopCallPresence(callId, participantUid).catch(error =>
            console.warn('Unable to clear call presence:', error),
          );
        }
      }

      onFinished();

      if (updateRoom && femaleUid) {
        try {
          await RoomService.endCall(femaleUid);
        } catch (error) {
          console.error('Unable to update ended call:', error);
        }
      }
    },
    [callId, femaleUid, gender, maleUid, onFinished, pauseBilling, stopTimer],
  );

  useEffect(() => {
    if (!freeCallEndsAt || !connected) return;
    const tick = setCallInterval(() => {
      if (Date.now() >= freeCallEndsAt) finishCall();
    }, 1000);
    if (Date.now() >= freeCallEndsAt) finishCall();
    return tick;
  }, [connected, finishCall, freeCallEndsAt]);

  const finishCallFromRemote = useCallback(
    (updateRoom: boolean, message: string) => {
      if (callEndedRef.current) {
        return;
      }

      finishCall(updateRoom);
      if (gender === 'male') {
        Alert.alert(copy.call.ended, message);
      }
    },
    [finishCall, gender],
  );

  const endForInsufficientBalance = useCallback(async () => {
    if (callEndedRef.current) {
      return;
    }

    const ending = finishCall();
    Alert.alert(
      copy.wallet.lowBalanceTitle,
      'Your coin balance is too low to continue this call.',
      [{ text: 'OK' }],
    );
    await ending;
  }, [finishCall]);

  const chargeNextMinute = useCallback(async () => {
    billingChargeInProgressRef.current = true;

    try {
      return await RoomService.chargeCallMinute(femaleUid);
    } finally {
      billingChargeInProgressRef.current = false;
    }
  }, [femaleUid]);

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
      const firstMinuteCharged = await chargeNextMinute();

      if (callEndedRef.current) {
        return;
      }

      if (!firstMinuteCharged) {
        await endForInsufficientBalance();
        return;
      }

      setBillingStarted(true);
      billingTimerRef.current = setCallInterval(async () => {
        if (callEndedRef.current || !connectedRef.current || peerRecoveryRef.current) return;
        const nextMinuteCharged = await chargeNextMinute();

        if (!nextMinuteCharged) {
          await endForInsufficientBalance();
        }
      }, 60 * 1000);
    } finally {
      billingStartingRef.current = false;
    }
  }, [chargeNextMinute, endForInsufficientBalance, gender]);

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
        'Please reopen Speakly 121 and try again.',
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

    rtcEngine.setEnableSpeakerphone(false);

    rtcEngine.registerEventHandler({
      onJoinChannelSuccess: () => {
        setStatus(copy.call.connecting);
      },

      onUserJoined: async () => {
        if (callEndedRef.current) {
          return;
        }
        peerRecoveryRef.current?.();
        peerRecoveryRef.current = null;
        connectedRef.current = true;
        setConnected(true);

        setStatus(copy.call.connected);

        const participantUid =
          gender === 'male' ? auth().currentUser?.uid : femaleUid;
        if (callId && participantUid) {
          await RoomService.startCallPresence(callId, participantUid).catch(error =>
            console.warn('Unable to mark call presence:', error),
          );
        }

        const callStartedAt = await RoomService.callConnected(femaleUid);
        startTimer(callStartedAt);
        if (isCaller && !callStartedTrackedRef.current) {
          callStartedTrackedRef.current = true;
          trackCallStarted('caller', callRatePerMinute);
        }
        await startBilling();
      },

      onUserOffline: (_connection, _remoteUid, reason) => {
        if (reason === UserOfflineReasonType.UserOfflineQuit) {
          finishCallFromRemote(true, 'The host ended the call.');
        } else {
          connectedRef.current = false;
          setConnected(false);
          pauseBilling();
          setStatus(copy.call.reconnecting);
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
          setStatus(copy.call.reconnecting);
        } else if (
          state === LocalAudioStreamState.LocalAudioStreamStateRecording ||
          state === LocalAudioStreamState.LocalAudioStreamStateEncoding
        ) {
          setStatus(copy.call.connected);
        }
      },

      onConnectionStateChanged: (_connection, state: ConnectionStateType) => {
        switch (state) {
          case ConnectionStateType.ConnectionStateConnecting:
            setStatus(copy.call.connecting);
            break;

          case ConnectionStateType.ConnectionStateConnected:
            setStatus(copy.call.connected);
            break;

          case ConnectionStateType.ConnectionStateReconnecting:
            setStatus(copy.call.reconnecting);
            break;

          case ConnectionStateType.ConnectionStateDisconnected:
            if (!callEndedRef.current) {
              connectedRef.current = false;
              setConnected(false);
              pauseBilling();
              setStatus(copy.call.reconnecting);
            }
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
    callRatePerMinute,
    callId,
    channelName,
    femaleUid,
    finishCall,
    finishCallFromRemote,
    isCaller,
    gender,
    maleUid,
    requestPermission,
    pauseBilling,
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

    InCallManager.setForceSpeakerphoneOn(value);

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

      const participantUid =
        gender === 'male' ? auth().currentUser?.uid : femaleUid;
      if (callId && participantUid) {
        RoomService.stopCallPresence(callId, participantUid).catch(error =>
          console.warn('Unable to clear call presence:', error),
        );
      }

      if (engine.current) {
        engine.current.leaveChannel();
        engine.current.release();
        engine.current = null;
      }
    };
  }, [callId, femaleUid, gender, initializeAgora, maleUid, stopBilling, stopTimer]);

  useEffect(() => {
    if (!femaleUid) {
      return;
    }

    return RoomService.listenCallStatus(femaleUid, room => {
      if (
        gender === 'female' &&
        room?.status === 'active' &&
        Number(room.chargedAmount || 0) >=
          normalizeCallRate(room.callRatePerMinute)
      ) {
        setBillingStarted(true);
      }

      if (room?.status === 'ended' && gender === 'male') {
        finishCallFromRemote(false, 'The call has ended.');
      } else if (
        !room ||
        ['ended', 'waiting', 'offline', 'rejected', 'men_rejected'].includes(
          room.status,
        )
      ) {
        finishCall(false);
      }
    });
  }, [femaleUid, finishCall, finishCallFromRemote, gender]);

  return (
    <LinearGradient
      colors={[Colors.background, Colors.primaryLight]}
      style={styles.container}
    >
      {visible && (
        <StatusBar
          backgroundColor={Colors.background}
          barStyle="dark-content"
        />
      )}
      <Modal transparent visible={showFreeCallModal} animationType="fade" onRequestClose={() => setShowFreeCallModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(37,27,32,0.58)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ width: '100%', maxWidth: 360, borderRadius: 28, padding: 26, alignItems: 'center', backgroundColor: Colors.surface }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryLight }}>
              <MaterialCommunityIcons name="gift-outline" size={36} color={Colors.primary} />
            </View>
            <Text style={{ marginTop: 18, color: Colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1.5 }}>FIRST CALL OFFER</Text>
            <Text style={{ marginTop: 8, color: Colors.textPrimary, fontSize: 23, lineHeight: 30, fontWeight: '900', textAlign: 'center' }}>Enjoy your free call</Text>
            <Text style={{ marginTop: 10, color: Colors.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' }}>Your first call is free for up to {freeCallMinutes} minutes. The call will end when your free time is up.</Text>
            <TouchableOpacity onPress={() => setShowFreeCallModal(false)} style={{ width: '100%', marginTop: 22, borderRadius: 16, overflow: 'hidden' }}>
              <LinearGradient colors={[Colors.primary, Colors.primaryPressed]} style={{ height: 54, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: Colors.white, fontSize: 16, fontWeight: '800' }}>Continue call</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <View pointerEvents="none" style={styles.callerDecorations}>
        <View style={styles.callerGlowTop} />
        <View style={styles.callerGlowBottom} />
      </View>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View
          style={[
            styles.header,
            styles.headerCaller,
            compactLayout && styles.headerCompact,
          ]}
        >
          <TouchableOpacity
            onPress={onMinimize}
            accessibilityLabel="Minimize call"
            style={styles.headerActionCaller}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={26}
              color={Colors.textPrimary}
            />
          </TouchableOpacity>

          <Text
            style={[
              styles.headerTitle,
              styles.headerTitleCaller,
              compactLayout && styles.headerTitleCompact,
            ]}
          >
            Ongoing Voice Call
          </Text>

          {connected ? (
            <TouchableOpacity
              accessibilityLabel="Safety options"
              accessibilityRole="button"
              disabled={safetyActionLoading}
              onPress={showSafetyOptions}
              style={styles.headerActionCaller}
            >
              <MaterialCommunityIcons
                name={safetyActionLoading ? 'loading' : 'shield-alert-outline'}
                size={25}
                color={Colors.primary}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.safetyPlaceholder} />
          )}
        </View>

        <View
          style={[
            styles.avatarContainer,
            styles.avatarContainerCaller,
            compactLayout && styles.avatarContainerCompact,
          ]}
        >
          <LinearGradient
            colors={Colors.buttonGradient}
            style={[
              styles.avatarOuter,
              styles.avatarOuterCaller,
              compactLayout && styles.avatarOuterCompact,
            ]}
          >
            <Image
              source={
                gender === 'male'
                  ? String(expertGender).toLowerCase() === 'male'
                    ? getMaleAvatar(avatarId)
                    : getFemaleAvatar(avatarId)
                  : String(maleGender).toLowerCase() === 'female'
                  ? getFemaleAvatar(avatarId)
                  : getMaleAvatar(avatarId)
              }
              style={[
                styles.avatar,
                styles.avatarCaller,
                compactLayout && styles.avatarCompact,
              ]}
            />

            <View style={styles.currentUserAvatarBadge}>
              <Image
                source={getUserAvatar(user)}
                style={styles.currentUserAvatar}
              />
              <View style={styles.currentUserOnlineDot} />
            </View>
          </LinearGradient>

          <View style={[styles.callDetails, styles.callDetailsCaller]}>
            <Text
              numberOfLines={1}
              style={[
                styles.name,
                styles.nameCaller,
                compactLayout && styles.nameCompact,
              ]}
            >
              {displayName}
            </Text>

            {showEnglishName && (
              <Text
                numberOfLines={1}
                style={[
                  styles.englishName,
                  styles.englishNameCaller,
                  compactLayout && styles.englishNameCompact,
                ]}
              >
                {englishName}
              </Text>
            )}

            <View
              style={[
                styles.statusContainer,
                styles.statusContainerCaller,
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

              <Text style={[styles.status, styles.statusCaller]}>
                {status}
              </Text>
            </View>

            {displayedBalance !== null && (
              <View
                style={[
                  styles.callerBalance,
                  compactLayout && styles.callerBalanceCompact,
                ]}
              >
                <Image
                  source={require('../../assets/coin.png')}
                  style={styles.callBalanceCoin}
                />
                <Text style={styles.callerBalanceLabel}>
                  {gender === 'male' ? 'Your balance' : 'Caller balance'}
                </Text>
                <Text style={styles.callerBalanceValue}>
                  {Math.floor(displayedBalance).toLocaleString()} coins
                </Text>
              </View>
            )}
            {estimatedMinutesRemaining !== null && (
              <Text style={styles.balanceEstimate}>
                {freeCallSecondsRemaining > 0
                  ? `Free call: about ${estimatedMinutesRemaining} min left`
                  : `About ${estimatedMinutesRemaining} min of calling left`}
              </Text>
            )}

            {callTimerReady && (
              <Text
                style={[
                  styles.callDurationLabel,
                  styles.callDurationLabelCaller,
                  compactLayout && styles.callDurationLabelCompact,
                ]}
              >
                Call duration
              </Text>
            )}

            {callTimerReady && (
              <Text
                style={[
                  styles.timer,
                  styles.timerCaller,
                  compactLayout && styles.timerCompact,
                ]}
              >
                {formatCallTime(displayedCallTime)}
              </Text>
            )}
          </View>
        </View>

        <View
          style={[
            styles.controls,
            styles.controlsCaller,
            compactLayout && styles.controlsCompact,
          ]}
        >
          <View style={[styles.row, compactLayout && styles.rowCompact]}>
            {/* Speaker */}

            <View style={styles.controlItem}>
              <TouchableOpacity
                accessibilityLabel={
                  muted ? 'Unmute microphone' : 'Mute microphone'
                }
                accessibilityRole="button"
                style={[
                  styles.controlButton,
                  styles.controlButtonCaller,
                  compactLayout && styles.controlButtonCompact,
                  speaker &&
                    styles.controlButtonActiveCaller,
                ]}
                activeOpacity={0.8}
                onPress={toggleSpeaker}
              >
                <MaterialCommunityIcons
                  name={speaker ? 'volume-high' : 'volume-off'}
                  size={compactLayout ? 22 : 24}
                  color={
                    speaker
                      ? Colors.white
                      : Colors.primary
                  }
                />
              </TouchableOpacity>

              <Text
                style={[
                  styles.controlText,
                  styles.controlTextCaller,
                ]}
              >
                Speaker
              </Text>
            </View>

            {/* Mute */}

            <View style={styles.controlItem}>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  styles.controlButtonCaller,
                  compactLayout && styles.controlButtonCompact,
                  muted &&
                    styles.controlButtonActiveCaller,
                ]}
                activeOpacity={0.8}
                onPress={toggleMute}
              >
                <MaterialCommunityIcons
                  name={muted ? 'microphone-off' : 'microphone'}
                  size={compactLayout ? 22 : 24}
                  color={
                    muted
                      ? Colors.white
                      : Colors.primary
                  }
                />
              </TouchableOpacity>

              <Text
                style={[
                  styles.controlText,
                  styles.controlTextCaller,
                ]}
              >
                {muted ? 'Unmute' : 'Mute'}
              </Text>
            </View>
          </View>

          {/* End Call */}

          <TouchableOpacity
            accessibilityLabel="End call"
            accessibilityRole="button"
            activeOpacity={0.9}
            style={styles.endButtonCaller}
            onPress={leaveCall}
          >
            <MaterialCommunityIcons
              name="phone-hangup"
              size={compactLayout ? 22 : 24}
              color={Colors.white}
            />
            <Text style={styles.endButtonCallerText}>End Call</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default CallScreen;
