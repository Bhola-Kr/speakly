import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
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

  const seconds = useRef(0);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [status, setStatus] = useState<string>(copy.call.connecting);

  const [connected, setConnected] = useState(false);

  const [billingStarted, setBillingStarted] = useState(false);

  const [muted, setMuted] = useState(false);

  const [speaker, setSpeaker] = useState(false);

  const [safetyActionLoading, setSafetyActionLoading] = useState(false);

  const [callerBalance, setCallerBalance] = useState<number | null>(null);

  const walletBalance = Number(user?.wallet?.balance);
  const countdownBalance = gender === 'male' ? walletBalance : callerBalance;

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

  const startTimer = useCallback(() => {
    if (timerRef.current) {
      return;
    }

    const startedAt = Date.now();
    seconds.current = 0;
    setElapsedSeconds(0);
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

  const paidMinuteSecondsRemaining =
    BILLING_INTERVAL_MS / 1000 -
    (elapsedSeconds % (BILLING_INTERVAL_MS / 1000));
  const callerWalletSeconds =
    callerBalance === null
      ? 0
      : Math.floor(Math.max(0, callerBalance) / callRatePerMinute) *
        (BILLING_INTERVAL_MS / 1000);
  const femaleRemainingSeconds = billingStarted
    ? callerWalletSeconds + paidMinuteSecondsRemaining
    : 0;
  const displayedCallTime =
    gender === 'female' ? femaleRemainingSeconds : elapsedSeconds;
  const callTimerReady =
    connected &&
    (gender === 'male' || (billingStarted && callerBalance !== null));

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
        if (callEndedRef.current || peerRecoveryRef.current) return;
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
        'Please reopen Speakly and try again.',
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
        setConnected(true);

        setStatus(copy.call.connected);

        startTimer();

        await RoomService.callConnected(femaleUid);
        if (isCaller && !callStartedTrackedRef.current) {
          callStartedTrackedRef.current = true;
          trackCallStarted('caller', callRatePerMinute);
        }
        await startBilling();
      },

      onUserOffline: (_connection, _remoteUid, reason) => {
        if (reason === UserOfflineReasonType.UserOfflineQuit) {
          finishCallFromRemote(
            true,
            'The host ended the call.',
          );
        } else {
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
            if (!callEndedRef.current) setStatus(copy.call.reconnecting);
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
    channelName,
    femaleUid,
    finishCall,
    finishCallFromRemote,
    isCaller,
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
      colors={
        isCaller
          ? [Colors.background, Colors.primaryLight]
          : [Colors.darkBackground, Colors.darkBackgroundAlt]
      }
      style={styles.container}
    >
      {visible && (
        <StatusBar
          backgroundColor={isCaller ? Colors.background : Colors.primary}
          barStyle={isCaller ? 'dark-content' : 'light-content'}
        />
      )}
      {isCaller && (
        <View pointerEvents="none" style={styles.callerDecorations}>
          <View style={styles.callerGlowTop} />
          <View style={styles.callerGlowBottom} />
        </View>
      )}
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View
          style={[
            styles.header,
            isCaller && styles.headerCaller,
            compactLayout && styles.headerCompact,
          ]}
        >
          <TouchableOpacity
            onPress={onMinimize}
            accessibilityLabel="Minimize call"
            style={isCaller && styles.headerActionCaller}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={26}
              color={isCaller ? Colors.textPrimary : Colors.white}
            />
          </TouchableOpacity>

          <Text
            style={[
              styles.headerTitle,
              isCaller && styles.headerTitleCaller,
              compactLayout && styles.headerTitleCompact,
            ]}
          >
            {isCaller ? 'Ongoing Voice Call' : 'Encrypted Voice Call'}
          </Text>

          {connected ? (
            <TouchableOpacity
              accessibilityLabel="Safety options"
              accessibilityRole="button"
              disabled={safetyActionLoading}
              onPress={showSafetyOptions}
              style={isCaller && styles.headerActionCaller}
            >
              <MaterialCommunityIcons
                name={safetyActionLoading ? 'loading' : 'shield-alert-outline'}
                size={25}
                color={isCaller ? Colors.primary : Colors.secondary}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.safetyPlaceholder} />
          )}
        </View>

        <View
          style={[
            styles.avatarContainer,
            isCaller && styles.avatarContainerCaller,
            compactLayout && styles.avatarContainerCompact,
          ]}
        >
          <LinearGradient
            colors={
              isCaller
                ? Colors.buttonGradient
                : [Colors.darkAvatarSurface, Colors.darkAvatarSurface]
            }
            style={[
              styles.avatarOuter,
              isCaller && styles.avatarOuterCaller,
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
                isCaller && styles.avatarCaller,
                compactLayout && styles.avatarCompact,
              ]}
            />

            {isCaller && (
              <View style={styles.currentUserAvatarBadge}>
                <Image
                  source={getUserAvatar(user)}
                  style={styles.currentUserAvatar}
                />
                <View style={styles.currentUserOnlineDot} />
              </View>
            )}
          </LinearGradient>

          <View
            style={[styles.callDetails, isCaller && styles.callDetailsCaller]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.name,
                isCaller && styles.nameCaller,
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
                  isCaller && styles.englishNameCaller,
                  compactLayout && styles.englishNameCompact,
                ]}
              >
                {englishName}
              </Text>
            )}

            <View
              style={[
                styles.statusContainer,
                isCaller && styles.statusContainerCaller,
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

              <Text style={[styles.status, isCaller && styles.statusCaller]}>
                {status}
              </Text>
            </View>

            {callTimerReady && (
              <Text
                style={[
                  styles.callDurationLabel,
                  isCaller && styles.callDurationLabelCaller,
                  compactLayout && styles.callDurationLabelCompact,
                ]}
              >
                {gender === 'female' ? 'Call time remaining' : 'Call duration'}
              </Text>
            )}

            {callTimerReady && (
              <Text
                style={[
                  styles.timer,
                  isCaller && styles.timerCaller,
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
            isCaller && styles.controlsCaller,
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
                  isCaller && styles.controlButtonCaller,
                  compactLayout && styles.controlButtonCompact,
                  speaker &&
                    (isCaller
                      ? styles.controlButtonActiveCaller
                      : styles.controlButtonActive),
                ]}
                activeOpacity={0.8}
                onPress={toggleSpeaker}
              >
                <MaterialCommunityIcons
                  name={speaker ? 'volume-high' : 'volume-off'}
                  size={compactLayout ? 22 : 24}
                  color={
                    speaker
                      ? isCaller
                        ? Colors.white
                        : Colors.darkBackground
                      : isCaller
                      ? Colors.primary
                      : Colors.white
                  }
                />
              </TouchableOpacity>

              <Text
                style={[
                  styles.controlText,
                  isCaller && styles.controlTextCaller,
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
                  isCaller && styles.controlButtonCaller,
                  compactLayout && styles.controlButtonCompact,
                  muted &&
                    (isCaller
                      ? styles.controlButtonActiveCaller
                      : styles.controlButtonActive),
                ]}
                activeOpacity={0.8}
                onPress={toggleMute}
              >
                <MaterialCommunityIcons
                  name={muted ? 'microphone-off' : 'microphone'}
                  size={compactLayout ? 22 : 24}
                  color={
                    muted
                      ? isCaller
                        ? Colors.white
                        : Colors.darkBackground
                      : isCaller
                      ? Colors.primary
                      : Colors.white
                  }
                />
              </TouchableOpacity>

              <Text
                style={[
                  styles.controlText,
                  isCaller && styles.controlTextCaller,
                ]}
              >
                {muted ? 'Unmute' : 'Mute'}
              </Text>
            </View>
          </View>

          {/* End Call */}

          {isCaller ? (
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
          ) : (
            <>
              <TouchableOpacity
                accessibilityLabel="End call"
                accessibilityRole="button"
                activeOpacity={0.9}
                style={[
                  styles.endButton,
                  compactLayout && styles.endButtonCompact,
                ]}
                onPress={leaveCall}
              >
                <MaterialCommunityIcons
                  name="phone-hangup"
                  size={compactLayout ? 22 : 24}
                  color={Colors.white}
                />
              </TouchableOpacity>

              <Text style={styles.endText}>End Call</Text>
            </>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default CallScreen;
