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
  DeviceEventEmitter,
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
import { fetchAgoraToken } from '../../api/calls';
import {
  getFemaleAvatar,
  getMaleAvatar,
  getUserAvatar,
  normalizeCallRate,
} from '../../constants/constants';
import { useUser } from '../../hooks/UserContext';
import {
  trackCallConnected,
  trackCallEnded,
  trackCallLifecycle,
  trackCallStarted,
} from '../../firebase/analytics';
import type { CallFollowUpIntent } from '../../types/callFollowUp';
import { CALL_RECHARGE_PROMPT_EVENT } from '../../utils/callRechargePrompt';
import {
  listenSignupOffer,
  SIGNUP_OFFER_AMOUNT,
} from '../../firebase/signupOffer';

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
    channelName: routeChannelName,
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
  const channelName = String(routeChannelName || agora?.channelName || '');
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
  const rtcGeneration = useRef(0);

  const timerRef = useRef<(() => void) | null>(null);
  const billingTimerRef = useRef<(() => void) | null>(null);
  const billingStartingRef = useRef(false);
  const billingChargeInProgressRef = useRef(false);
  const peerRecoveryRef = useRef<(() => void) | null>(null);
  const callEndedRef = useRef(false);
  const callStartedTrackedRef = useRef(false);
  const countdownAlertedRef = useRef(false);
  const freeCallEndsAtRef = useRef(0);
  const connectedRef = useRef(false);
  const callConnectedAtRef = useRef(0);
  const callEndTrackedRef = useRef(false);

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
  const [freeCallAmount, setFreeCallAmount] = useState(SIGNUP_OFFER_AMOUNT);
  const [freeCallSecondsRemaining, setFreeCallSecondsRemaining] = useState(0);

  const walletBalance = Number(user?.wallet?.balance);
  const displayedBalance =
    gender === 'male'
      ? Number.isFinite(walletBalance)
        ? Math.max(0, walletBalance)
        : null
      : callerBalance;
  const estimatedMinutesRemaining =
    freeCallSecondsRemaining > 0
      ? Math.ceil(freeCallSecondsRemaining / 60)
      : displayedBalance === null
      ? null
      : Math.floor(displayedBalance / callRatePerMinute) +
        (billingStarted ? 1 : 0);
  const countdownBalance = gender === 'male' ? walletBalance : callerBalance;

  useEffect(() => {
    if (
      !connected ||
      gender !== 'male' ||
      !user?.uid ||
      !user?.offers?.signupOffer?.claimedAt ||
      !femaleUid
    )
      return;
    let cancelled = false;
    let stopListeningForOffer: (() => void) | undefined;
    const configureFirstFreeCall = async () => {
      const [historySnapshot, roomSnapshot] = await Promise.all([
        database().ref(`callHistory/${user.uid}`).once('value'),
        database().ref(`rooms/${femaleUid}`).once('value'),
      ]);
      if (cancelled) return;
      const history = historySnapshot.val() || {};
      const hasCompletedCall = Object.values(history).some(
        (item: any) => item?.status === 'Completed',
      );
      if (hasCompletedCall) return;
      const room = roomSnapshot.val();
      const billableMs = Number(room?.billableMs || 0);
      const creditedAmount = Number(user?.offers?.signupOffer?.amount);

      stopListeningForOffer = listenSignupOffer(config => {
        if (!config.active || config.amount <= 0) {
          freeCallEndsAtRef.current = 0;
          setFreeCallEndsAt(0);
          setFreeCallSecondsRemaining(0);
          setShowFreeCallModal(false);
          return;
        }

        const endsAt =
          Date.now() +
          Math.max(0, config.freeMinutes * BILLING_INTERVAL_MS - billableMs);
        setFreeCallMinutes(config.freeMinutes);
        setFreeCallAmount(
          Number.isFinite(creditedAmount) && creditedAmount > 0
            ? creditedAmount
            : config.amount,
        );
        freeCallEndsAtRef.current = endsAt;
        setFreeCallEndsAt(endsAt);
        setFreeCallSecondsRemaining(
          Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
        );
        setShowFreeCallModal(true);
      });
    };
    configureFirstFreeCall().catch(error =>
      console.warn('Unable to load first-call free limit:', error),
    );
    return () => {
      cancelled = true;
      stopListeningForOffer?.();
    };
  }, [
    connected,
    femaleUid,
    gender,
    user?.offers?.signupOffer?.amount,
    user?.offers?.signupOffer?.claimedAt,
    user?.uid,
  ]);

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

    // Connected duration is supplied by backend-confirmed intervals.
    void startedAt;
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      timerRef.current();
      timerRef.current = null;
    }
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
    async (updateRoom = true, endReason?: CallFollowUpIntent['source']) => {
      if (callEndedRef.current) {
        return;
      }

      callEndedRef.current = true;
      if (!callEndTrackedRef.current) {
        callEndTrackedRef.current = true;
        trackCallEnded(
          isCaller ? 'caller' : 'expert',
          callConnectedAtRef.current
            ? Math.max(0, (Date.now() - callConnectedAtRef.current) / 1000)
            : 0,
          endReason ||
            (callConnectedAtRef.current ? 'normal' : 'not_connected'),
        );
      }
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

      if (endReason && gender === 'male' && femaleUid) {
        const followUpIntent: CallFollowUpIntent = {
          action: 'call_again',
          hostUid: femaleUid,
          hostName: displayName,
          hostProfile: {
            uid: femaleUid,
            name: englishName || displayName,
            ...(tamilName ? { tamilName } : {}),
            gender: expertGender,
            avatarId,
            price: callRatePerMinute,
          },
          originalCallId: callId || '',
          ratePerMinute: callRatePerMinute,
          source: endReason,
          createdAt: Date.now(),
        };
        setTimeout(
          () =>
            DeviceEventEmitter.emit(CALL_RECHARGE_PROMPT_EVENT, followUpIntent),
          250,
        );
      }

      if (updateRoom && femaleUid) {
        try {
          await RoomService.endCall(femaleUid, callId);
        } catch (error) {
          console.error('Unable to update ended call:', error);
        }
      }
    },
    [
      avatarId,
      callId,
      callRatePerMinute,
      displayName,
      englishName,
      expertGender,
      femaleUid,
      gender,
      isCaller,
      onFinished,
      pauseBilling,
      stopTimer,
      tamilName,
    ],
  );

  useEffect(() => {
    if (!freeCallEndsAt || !connected) return;
    let endingTimer: ReturnType<typeof setTimeout> | undefined;

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil((freeCallEndsAt - Date.now()) / 1000),
      );
      setFreeCallSecondsRemaining(remaining);

      if (remaining === 0 && !callEndedRef.current) {
        setStatus('Free Minutes Khatam Ho Gaye');
        endingTimer = setTimeout(
          () => finishCall(true, 'free_call_expired'),
          800,
        );
      }
    };

    updateCountdown();
    const tick = setCallInterval(updateCountdown, 1000);
    return () => {
      tick();
      if (endingTimer) clearTimeout(endingTimer);
    };
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

    const ending = finishCall(true, 'insufficient_balance');
    await ending;
  }, [finishCall]);

  const chargeNextMinute = useCallback(async () => {
    billingChargeInProgressRef.current = true;

    try {
      return await RoomService.chargeCallMinute(femaleUid, callId);
    } finally {
      billingChargeInProgressRef.current = false;
    }
  }, [femaleUid, callId]);

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
        if (
          callEndedRef.current ||
          !connectedRef.current ||
          peerRecoveryRef.current ||
          (freeCallEndsAtRef.current > 0 &&
            Date.now() >= freeCallEndsAtRef.current)
        )
          return;
        try {
          const nextMinuteCharged = await chargeNextMinute();
          if (!nextMinuteCharged) {
            await endForInsufficientBalance();
          }
        } catch {
          if (!callEndedRef.current) setStatus(copy.call.reconnecting);
        }
      }, 5000);
    } catch {
      if (!callEndedRef.current) setStatus(copy.call.reconnecting);
    } finally {
      billingStartingRef.current = false;
    }
  }, [chargeNextMinute, endForInsufficientBalance, gender]);

  const initializeAgora = useCallback(
    async (generation: number) => {
      const permission = await requestPermission();

      if (callEndedRef.current || generation !== rtcGeneration.current) {
        return;
      }

      if (!permission) {
        Alert.alert('Permission', 'Mic ki permission zaroori hai.');
        await finishCall();
        return;
      }

      try {
        await startCallRuntime();
      } catch (error) {
        if (generation !== rtcGeneration.current) return;
        console.error('Unable to start background call service:', error);
        Alert.alert(
          'Call shuru nahi hui',
          'Speakly 121 dobara kholo aur try karo.',
        );
        await finishCall();
        return;
      }
      if (callEndedRef.current || generation !== rtcGeneration.current) {
        return;
      }

      const rtcEngine = createAgoraRtcEngine();
      const isCurrentSession = () =>
        generation === rtcGeneration.current &&
        !callEndedRef.current &&
        engine.current === rtcEngine;

      rtcEngine.initialize({
        appId: 'f6bec5b940ea4b11af21f3b931f73536', // Replace with your Agora App ID
      });

      rtcEngine.enableAudio();

      rtcEngine.setChannelProfile(
        ChannelProfileType.ChannelProfileCommunication,
      );

      rtcEngine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

      rtcEngine.setEnableSpeakerphone(false);

      rtcEngine.registerEventHandler({
        onJoinChannelSuccess: () => {
          if (!isCurrentSession()) return;
          setStatus(copy.call.connecting);
        },

        onUserJoined: async (_connection, remoteUid) => {
          const expectedPeer = isCaller ? agora?.female?.uid : agora?.male?.uid;
          if (!isCurrentSession() || remoteUid !== expectedPeer) {
            return;
          }
          peerRecoveryRef.current?.();
          peerRecoveryRef.current = null;
          connectedRef.current = true;
          setConnected(true);
          if (!callConnectedAtRef.current) {
            callConnectedAtRef.current = Date.now();
            trackCallConnected(
              isCaller ? 'caller' : 'expert',
              callRatePerMinute,
            );
          } else {
            trackCallLifecycle('CallReconnected', {
              role: isCaller ? 'caller' : 'expert',
              ...(callId ? { call_id: callId } : {}),
            });
          }

          setStatus(copy.call.connected);

          const participantUid =
            gender === 'male' ? auth().currentUser?.uid : femaleUid;
          if (callId && participantUid) {
            await RoomService.startCallPresence(callId, participantUid).catch(
              error => console.warn('Unable to mark call presence:', error),
            );
          }

          if (!isCurrentSession()) return;
          let callStartedAt: number;
          try {
            callStartedAt = await RoomService.callConnected(femaleUid, callId);
          } catch {
            if (isCurrentSession()) await finishCall(false);
            return;
          }
          if (!isCurrentSession()) return;
          startTimer(callStartedAt);
          if (isCaller && !callStartedTrackedRef.current) {
            callStartedTrackedRef.current = true;
            trackCallStarted('caller', callRatePerMinute);
          }
          await startBilling();
        },

        onUserOffline: (_connection, _remoteUid, reason) => {
          if (!isCurrentSession()) return;
          if (_remoteUid !== (isCaller ? agora?.female?.uid : agora?.male?.uid))
            return;
          RoomService.callSessionEvent(femaleUid, callId, 'disconnected').catch(
            console.warn,
          );
          if (reason === UserOfflineReasonType.UserOfflineQuit) {
            finishCallFromRemote(true, 'Expert ne call khatam kar di.');
          } else {
            connectedRef.current = false;
            setConnected(false);
            trackCallLifecycle('CallConnectionLost', {
              role: isCaller ? 'caller' : 'expert',
              ...(callId ? { call_id: callId } : {}),
            });
            pauseBilling();
            stopTimer();
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
          if (!isCurrentSession()) return;
          if (
            reason ===
              LocalAudioStreamReason.LocalAudioStreamReasonInterrupted ||
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
          if (!isCurrentSession()) return;
          switch (state) {
            case ConnectionStateType.ConnectionStateConnecting:
              setStatus(copy.call.connecting);
              break;

            case ConnectionStateType.ConnectionStateConnected:
              setStatus(copy.call.connected);
              if (
                callConnectedAtRef.current &&
                !peerRecoveryRef.current &&
                !connectedRef.current &&
                !callEndedRef.current
              ) {
                RoomService.callSessionEvent(femaleUid, callId, 'connected')
                  .then(() => {
                    if (isCurrentSession()) {
                      connectedRef.current = true;
                      setConnected(true);
                    }
                  })
                  .catch(console.warn);
              }
              break;

            case ConnectionStateType.ConnectionStateReconnecting:
              setStatus(copy.call.reconnecting);
            case ConnectionStateType.ConnectionStateDisconnected:
              RoomService.callSessionEvent(
                femaleUid,
                callId,
                'disconnected',
              ).catch(console.warn);
              if (!callEndedRef.current) {
                connectedRef.current = false;
                setConnected(false);
                pauseBilling();
                stopTimer();
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

      if (!callId || channelName !== `call_${callId}` || !uid) {
        Alert.alert('Call Mein Dikkat', 'Call shuru nahi hui.');
        await finishCall();
        return;
      }

      let ownToken: string;
      try {
        const credentials = await fetchAgoraToken(channelName);
        ownToken = isCaller ? credentials.male.token : credentials.female.token;
        if (!ownToken) throw new Error('Call access nahi mila.');
      } catch {
        if (isCurrentSession()) await finishCall();
        return;
      }
      if (!isCurrentSession()) return;
      rtcEngine.joinChannel(ownToken, channelName, uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });
    },
    [
      callRatePerMinute,
      callId,
      channelName,
      femaleUid,
      finishCall,
      finishCallFromRemote,
      isCaller,
      gender,
      requestPermission,
      pauseBilling,
      startTimer,
      stopTimer,
      startBilling,
      token,
      uid,
    ],
  );

  useEffect(() => {
    if (!connected || !callId || !femaleUid) return;
    let active = true;
    let pending = false;
    const heartbeat = async () => {
      if (pending || callEndedRef.current) return;
      pending = true;
      try {
        const result = await RoomService.callSessionEvent(
          femaleUid,
          callId,
          'heartbeat',
        );
        if (!active) return;
        setBillingStarted(result.active);
        seconds.current = Math.floor(result.duration / 1000);
        setElapsedSeconds(seconds.current);
        if (freeCallEndsAtRef.current > 0) {
          const endsAt =
            Date.now() +
            Math.max(
              0,
              freeCallMinutes * BILLING_INTERVAL_MS - result.duration,
            );
          freeCallEndsAtRef.current = endsAt;
          setFreeCallEndsAt(endsAt);
        }
        if (result.ended || result.insufficient) await finishCall(false);
      } catch {
        if (active) setStatus(copy.call.reconnecting);
      } finally {
        pending = false;
      }
    };
    heartbeat();
    const timer = setInterval(heartbeat, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [connected, femaleUid, callId, finishCall, freeCallMinutes]);

  const leaveCall = () => {
    Alert.alert('Call Khatam Karo', 'Kya aap call khatam karna chahte ho?', [
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
      Alert.alert('Report Nahi Gayi', 'Dusre user ki pehchaan nahi hui.');
      return;
    }

    RoomService.reportUser(reporterUid, reportedUid, reason)
      .then(() => {
        Alert.alert(
          'Report Bhej Di Gayi',
          'Report mil gayi hai. Hamari moderation team ise check karegi.',
        );
      })
      .catch(() => {
        Alert.alert('Report Nahi Gayi', 'Dobara try karo.');
      });
  };

  const showReportOptions = () => {
    if (!connected) {
      return;
    }

    Alert.alert('User Ko Report Karo', 'Report ka reason chuno.', [
      {
        text: 'Harassment',
        onPress: () => reportUser('Harassment'),
      },
      {
        text: 'Galat Vyavahaar',
        onPress: () => reportUser('Galat Vyavahaar'),
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
      Alert.alert('Block Nahi Hua', 'Dusre user ki pehchaan nahi hui.');
      return;
    }

    Alert.alert(
      'User Ko Block Karo',
      `Block ${displayName}? Iske baad aap ek-dusre ko call nahi kar paoge.`,
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
              Alert.alert('Block Nahi Hua', 'Dobara try karo.');
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
      'Safety Ke Options',
      `Inke saath baat karne ke options: ${displayName}.`,
      [
        { text: 'User Ko Report Karo', onPress: showReportOptions },
        {
          text: 'User Ko Block Karo',
          style: 'destructive',
          onPress: blockUser,
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  useEffect(() => {
    callEndedRef.current = false;
    const generation = ++rtcGeneration.current;
    initializeAgora(generation).catch(async error => {
      if (generation !== rtcGeneration.current) return;
      console.error('Unable to initialize call:', error);
      await finishCall();
    });

    return () => {
      rtcGeneration.current += 1;
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
  }, [
    callId,
    femaleUid,
    finishCall,
    gender,
    initializeAgora,
    stopBilling,
    stopTimer,
  ]);

  useEffect(() => {
    if (!femaleUid) {
      return;
    }

    return RoomService.listenCallStatus(femaleUid, room => {
      if (room.currentCallId !== callId) {
        finishCall(false);
        return;
      }
      if (
        gender === 'female' &&
        room?.status === 'active' &&
        Number(room.chargedAmount || 0) >=
          normalizeCallRate(room.callRatePerMinute)
      ) {
        setBillingStarted(true);
      }

      if (room?.status === 'ended' && gender === 'male') {
        finishCallFromRemote(false, 'Call khatam ho gayi.');
      } else if (
        !room ||
        ['ended', 'waiting', 'offline', 'rejected', 'men_rejected'].includes(
          room.status,
        )
      ) {
        finishCall(false);
      }
    });
  }, [callId, femaleUid, finishCall, finishCallFromRemote, gender]);

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
      <Modal
        transparent
        visible={showFreeCallModal}
        animationType="fade"
        onRequestClose={() => setShowFreeCallModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(37,27,32,0.58)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 360,
              borderRadius: 28,
              padding: 26,
              alignItems: 'center',
              backgroundColor: Colors.surface,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: Colors.primaryLight,
              }}
            >
              <MaterialCommunityIcons
                name="gift-outline"
                size={36}
                color={Colors.primary}
              />
            </View>
            <Text
              style={{
                marginTop: 18,
                color: Colors.primary,
                fontSize: 12,
                fontWeight: '900',
                letterSpacing: 1.5,
              }}
            >
              Pehli Call Ka Offer
            </Text>
            <Text
              style={{
                marginTop: 8,
                color: Colors.textPrimary,
                fontSize: 23,
                lineHeight: 30,
                fontWeight: '900',
                textAlign: 'center',
              }}
            >
              Aapki Pehli {freeCallMinutes}{' '}
              {freeCallMinutes === 1 ? 'minute' : 'minutes'} free hain
            </Text>
            <Text
              style={{
                marginTop: 10,
                color: Colors.textSecondary,
                fontSize: 15,
                lineHeight: 22,
                textAlign: 'center',
              }}
            >
              Humne Add Kiye ₹{freeCallAmount} free call balance. Ismein milte
              hain {freeCallMinutes}{' '}
              {freeCallMinutes === 1 ? 'minute' : 'minutes'} kisi bhi expert ke
              saath.
            </Text>
            <TouchableOpacity
              onPress={() => setShowFreeCallModal(false)}
              style={{
                width: '100%',
                marginTop: 22,
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryPressed]}
                style={{
                  height: 54,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: '800',
                  }}
                >
                  Baat Jaari Rakho
                </Text>
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
            accessibilityLabel="Call Chhoti Karo"
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
            Call Chal Rahi Hai
          </Text>

          {connected ? (
            <TouchableOpacity
              accessibilityLabel="Safety ke options"
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

        {gender === 'male' && freeCallSecondsRemaining > 0 && (
          <View
            style={{
              alignSelf: 'center',
              marginTop: 8,
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderRadius: 18,
              backgroundColor:
                freeCallSecondsRemaining <= 15
                  ? Colors.warningStrongSurface
                  : Colors.primaryLight,
              borderWidth: 1,
              borderColor:
                freeCallSecondsRemaining <= 15
                  ? Colors.warning
                  : Colors.primary,
            }}
          >
            <Text
              style={{
                color:
                  freeCallSecondsRemaining <= 15
                    ? Colors.warning
                    : Colors.primary,
                fontSize: 14,
                fontWeight: '800',
              }}
            >
              {freeCallSecondsRemaining <= 5
                ? `Free call khatam hogi: ${freeCallSecondsRemaining} seconds`
                : freeCallSecondsRemaining <= 15
                ? `${freeCallSecondsRemaining} seconds baaki${displayName} se baat jaari rakh sakte ho.`
                : freeCallSecondsRemaining <= 30
                ? `${freeCallSecondsRemaining} seconds baaki hain: ${displayName}Baat jaari rakhne ke liye call ke baad recharge kar sakte ho.`
                : `Free Call · ${freeCallSecondsRemaining}s`}
            </Text>
          </View>
        )}

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

              <Text style={[styles.status, styles.statusCaller]}>{status}</Text>
            </View>

            {displayedBalance !== null && (
              <View
                style={[
                  styles.callerBalance,
                  compactLayout && styles.callerBalanceCompact,
                ]}
              >
                <View style={styles.callBalanceRupee}>
                  <Text style={styles.callBalanceRupeeText}>₹</Text>
                </View>
                <Text style={styles.callerBalanceLabel}>
                  {gender === 'male' ? 'Aapka Balance' : 'Customer Ka Balance'}
                </Text>
                <Text style={styles.callerBalanceValue}>
                  ₹{Math.floor(displayedBalance).toLocaleString()}
                </Text>
              </View>
            )}
            {estimatedMinutesRemaining !== null && (
              <Text style={styles.balanceEstimate}>
                {freeCallSecondsRemaining > 0
                  ? `Free call: lagbhag ${estimatedMinutesRemaining} min baaki`
                  : `Lagbhag ${estimatedMinutesRemaining} min ki baat baaki`}
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
                Call Ka Samay
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
                accessibilityLabel={muted ? 'Mic Chalu Karo' : 'Mic Band Karo'}
                accessibilityRole="button"
                style={[
                  styles.controlButton,
                  styles.controlButtonCaller,
                  compactLayout && styles.controlButtonCompact,
                  speaker && styles.controlButtonActiveCaller,
                ]}
                activeOpacity={0.8}
                onPress={toggleSpeaker}
              >
                <MaterialCommunityIcons
                  name={speaker ? 'volume-high' : 'volume-off'}
                  size={compactLayout ? 22 : 24}
                  color={speaker ? Colors.white : Colors.primary}
                />
              </TouchableOpacity>

              <Text style={[styles.controlText, styles.controlTextCaller]}>
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
                  muted && styles.controlButtonActiveCaller,
                ]}
                activeOpacity={0.8}
                onPress={toggleMute}
              >
                <MaterialCommunityIcons
                  name={muted ? 'microphone-off' : 'microphone'}
                  size={compactLayout ? 22 : 24}
                  color={muted ? Colors.white : Colors.primary}
                />
              </TouchableOpacity>

              <Text style={[styles.controlText, styles.controlTextCaller]}>
                {muted ? 'Unmute' : 'Mute'}
              </Text>
            </View>
          </View>

          {/* End Call */}

          <TouchableOpacity
            accessibilityLabel="Call Khatam Karo"
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
            <Text style={styles.endButtonCallerText}>Call Khatam Karo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default CallScreen;
