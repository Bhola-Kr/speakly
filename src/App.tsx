import * as React from 'react';
import {
  Alert,
  AppState,
  DeviceEventEmitter,
  Platform,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  createNavigationContainerRef,
  NavigationContainer,
  ParamListBase,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import BirthYearScreen from './screens/BirthYearScreen';
import NicknameScreen from './screens/NicknameScreen';
import OtpScreen from './screens/OtpScreen';
import GenderScreen from './screens/GenderScreen';
import AvatarScreen from './screens/AvatarScreen';
import AudioVerificationScreen from './screens/AudioVerificationScreen';
import BottomTabs from './screens/BottomTabs';
import Colors from './constants/colors';
import ProfileSettingScreen from './screens/profile/ProfileScreenSettings';
import { EditProfileScreen } from './screens/profile/EditProfileScreen';
import WalletScreen from './screens/payment/WalletScreen';
import TransactionScreen from './screens/payment/TransactionScreen';
import CallScreen from './screens/agora/CallScreen';
import CallEntryScreen from './screens/agora/CallEntryScreen';
import { ActiveCallProvider, useActiveCall } from './hooks/ActiveCallContext';
import IncomingCallScreen from './screens/agora/incomingCall/IncomingCallScreen';
import { OutgoingCallScreen } from './screens/agora/outgoingCall/OutgoingCallScreen';
import FemaleHistoryScreen from './screens/FemaleHistoryScreen';
import FemaleHomeScreen from './screens/FemaleHomeScreen';
import FemaleBottomTabs from './screens/FemaleBottomTabs';
import ManHistoryScreen from './screens/recentScreen/ManHistoryScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import TermsAndConditionsScreen from './screens/TermsAndConditionsScreen';
import FAQScreen from './screens/FAQScreen';
import SplashScreen from './screens/SplashScreen';
import OnlineRoomScreen from './screens/agora/OnlineRoomScreen';
import { UserProvider, useUser } from './hooks/UserContext';
import PaymentScreen from './screens/payment/PaymentScreen';
import AppUpdateGate from './components/appUpdate/AppUpdateGate';
import {
  ACCEPTED_CALL_EVENT,
  CHAT_NOTIFICATION_OPEN_EVENT,
  cancelIncomingCallNotification,
  consumePendingAcceptedCall,
  consumePendingChatNotification,
  displayIncomingCallNotification,
  startPushNotifications,
} from './notifications/pushNotifications';
import { AdminUsersScreen } from './screens/admin/AdminUsersScreen';
import IncomingCallModal from './screens/agora/IncomingCallModal';
import RoomService, { Room } from './firebase/RoomService';
import database from '@react-native-firebase/database';
import ChatConversationScreen from './screens/chat/ChatConversationScreen';
import ChatTheme from './screens/chat/chatTheme';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef<ParamListBase>();
const deferUpdatesOn = new Set([
  'Splash',
  'Call',
  'IncomingCall',
  'OutgoingCall',
  'OnlineRoom',
  'Payment',
]);

const getStatusBarAppearance = (screen: string) => {
  if (screen === 'Chat' || screen === 'ChatConversation') {
    return { backgroundColor: ChatTheme.heroStart, barStyle: 'light-content' as const };
  }
  if (screen === 'IncomingCall' || screen === 'OutgoingCall') {
    return { backgroundColor: Colors.navy, barStyle: 'light-content' as const };
  }
  if (screen === 'Splash' || screen === 'Call' || screen === 'OnlineRoom') {
    return { backgroundColor: Colors.primary, barStyle: 'light-content' as const };
  }
  return { backgroundColor: Colors.background, barStyle: 'dark-content' as const };
};

function RootStack() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="BirthYear" component={BirthYearScreen} />
      <Stack.Screen name="Nickname" component={NicknameScreen} />
      <Stack.Screen name="Gender" component={GenderScreen} />
      {/* <Stack.Screen name="Language" component={LanguageScreen} /> */}
      <Stack.Screen name="Avatar" component={AvatarScreen} />
      <Stack.Screen
        name="AudioVerification"
        component={AudioVerificationScreen}
      />
      <Stack.Screen name="Main" component={BottomTabs} />
      <Stack.Screen name="FemaleBottomTabs" component={FemaleBottomTabs} />
      <Stack.Screen name="ProfileSetting" component={ProfileSettingScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Stack.Screen
        name="ChatConversation"
        component={ChatConversationScreen}
      />
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Edit Profile',
          headerStyle: { backgroundColor: Colors.background },
        }}
        name="EditProfile"
        component={EditProfileScreen}
      />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Transaction" component={TransactionScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="Call" component={CallEntryScreen} />
      <Stack.Screen name="IncomingCall" component={IncomingCallScreen} />
      <Stack.Screen name="OutgoingCall" component={OutgoingCallScreen} />
      <Stack.Screen name="FemaleHome" component={FemaleHomeScreen} />
      <Stack.Screen name="OnlineRoom" component={OnlineRoomScreen} />
      <Stack.Screen
        options={{
          headerShown: false,
          title: 'Recent',
          headerStyle: { backgroundColor: Colors.background },
        }}
        name="ManHistory"
        component={ManHistoryScreen}
      />
      <Stack.Screen name="FemaleHistory" component={FemaleHistoryScreen} />
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.background },
        }}
        name="TermsAndConditions"
        component={TermsAndConditionsScreen}
      />
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.background },
        }}
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
      />
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.background },
        }}
        name="FAQ"
        component={FAQScreen}
      />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const [activeScreen, setActiveScreen] = React.useState('Splash');
  const [incomingRoom, setIncomingRoom] = React.useState<Room | null>(null);
  const incomingNotificationRef = React.useRef('');
  const restoringPresenceRef = React.useRef(false);
  const { user } = useUser();
  const { activeCall, visible, showCall, minimizeCall, clearCall } =
    useActiveCall();
  const statusBarAppearance = React.useMemo(
    () => getStatusBarAppearance(activeScreen),
    [activeScreen],
  );
  const femaleUid =
    user?.profile?.gender === 'female' ? String(user?.uid || '') : '';
  const syncActiveScreen = () =>
    setActiveScreen(navigationRef.getCurrentRoute()?.name ?? 'Splash');

  const applyStatusBarAppearance = React.useCallback(() => {
    StatusBar.setBarStyle(statusBarAppearance.barStyle, true);
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(statusBarAppearance.backgroundColor, true);
    }
  }, [statusBarAppearance]);

  React.useEffect(() => {
    applyStatusBarAppearance();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') applyStatusBarAppearance();
    });
    return () => subscription.remove();
  }, [applyStatusBarAppearance]);
  React.useEffect(() => {
    if (!femaleUid) return;
    const connectedRef = database().ref('.info/connected');
    const listener = connectedRef.on('value', snapshot => {
      if (snapshot.val() !== true || restoringPresenceRef.current) return;
      restoringPresenceRef.current = true;
      RoomService.restoreFemaleAvailability()
        .catch(error =>
          console.warn('Unable to restore female availability:', error),
        )
        .finally(() => {
          restoringPresenceRef.current = false;
        });
    });
    return () => connectedRef.off('value', listener);
  }, [femaleUid]);

  React.useEffect(() => {
    if (!femaleUid) {
      setIncomingRoom(null);
      return;
    }
    return RoomService.listenCallStatus(femaleUid, room => {
      if (room?.status === 'ringing' && room.male && !activeCall) {
        setIncomingRoom(room);
        if (
          AppState.currentState !== 'active' &&
          incomingNotificationRef.current !== room.currentCallId
        ) {
          incomingNotificationRef.current = room.currentCallId;
          displayIncomingCallNotification(
            room.currentCallId,
            room.male.name,
            femaleUid,
          ).catch(error =>
            console.warn('Unable to show incoming call notification:', error),
          );
        }
      } else {
        setIncomingRoom(null);
        if (room?.status !== 'ringing') {
          const resolvedCallId = incomingNotificationRef.current;
          incomingNotificationRef.current = '';
          if (resolvedCallId) {
            cancelIncomingCallNotification(resolvedCallId).catch(error =>
              console.warn('Unable to clear incoming call notification:', error),
            );
          }
        }
      }
    });
  }, [activeCall, femaleUid]);

  const acceptIncomingCall = React.useCallback(async () => {
    if (!incomingRoom || !femaleUid) return;
    try {
      await RoomService.acceptCall(femaleUid);
      const room = incomingRoom;
      await cancelIncomingCallNotification(room.currentCallId);
      setIncomingRoom(null);
      if (navigationRef.isReady()) {
        navigationRef.navigate('Call', {
          gender: 'female',
          userName: room.male?.name,
          avatarId: room.male?.avatarId,
          maleUid: room.male?.uid,
          femaleUid,
          uid: room.roomId,
          agora: room.agora,
        });
      }
    } catch {
      Alert.alert('Unable to Join Call', 'Please try again.');
    }
  }, [femaleUid, incomingRoom]);

  const declineIncomingCall = React.useCallback(async () => {
    if (!femaleUid) return;
    try {
      if (incomingRoom?.currentCallId) {
        await cancelIncomingCallNotification(incomingRoom.currentCallId);
      }
      setIncomingRoom(null);
      await RoomService.rejectCall(femaleUid);
    } catch {
      Alert.alert('Unable to Decline Call', 'Please try again.');
    }
  }, [femaleUid, incomingRoom?.currentCallId]);

  const openAcceptedNotificationCall = React.useCallback(async () => {
    if (!femaleUid || activeCall || !navigationRef.isReady()) return;
    const pending = await consumePendingAcceptedCall();
    if (!pending || pending.femaleUid !== femaleUid) return;
    const snapshot = await database()
      .ref(`rooms/${femaleUid}`)
      .once('value');
    const room = snapshot.val() as Room | null;
    if (
      !room ||
      room.status !== 'accepted' ||
      room.currentCallId !== pending.callId
    ) {
      return;
    }
    navigationRef.navigate('Call', {
      gender: 'female',
      userName: room.male?.name,
      avatarId: room.male?.avatarId,
      maleUid: room.male?.uid,
      femaleUid,
      uid: room.roomId,
      agora: room.agora,
    });
  }, [activeCall, femaleUid]);

  const openChatNotification = React.useCallback(async () => {
    if (
      !user?.uid ||
      !navigationRef.isReady() ||
      ['Splash', 'Login', 'Otp', 'Gender', 'Nickname', 'BirthYear', 'Avatar'].includes(activeScreen)
    ) {
      return;
    }
    const pending = await consumePendingChatNotification();
    if (!pending) return;
    const rootRoute = user?.profile?.gender === 'female'
      ? 'FemaleBottomTabs'
      : 'Main';
    navigationRef.navigate(rootRoute, { screen: 'Chat' });
  }, [activeScreen, user?.profile?.gender, user?.uid]);

  React.useEffect(() => {
    const eventSubscription = DeviceEventEmitter.addListener(
      ACCEPTED_CALL_EVENT,
      openAcceptedNotificationCall,
    );
    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setTimeout(() => openAcceptedNotificationCall(), 300);
      }
    });
    const initialTimer = setTimeout(() => openAcceptedNotificationCall(), 500);
    return () => {
      eventSubscription.remove();
      appStateSubscription.remove();
      clearTimeout(initialTimer);
    };
  }, [openAcceptedNotificationCall]);

  React.useEffect(() => {
    const eventSubscription = DeviceEventEmitter.addListener(
      CHAT_NOTIFICATION_OPEN_EVENT,
      openChatNotification,
    );
    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setTimeout(() => openChatNotification(), 350);
      }
    });
    const initialTimer = setTimeout(() => openChatNotification(), 800);
    return () => {
      eventSubscription.remove();
      appStateSubscription.remove();
      clearTimeout(initialTimer);
    };
  }, [openChatNotification]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={syncActiveScreen}
      onStateChange={syncActiveScreen}
    >
      <View style={callStyles.root}>
        {activeCall && !visible && (
          <SafeAreaView edges={['top']} style={callStyles.bar}>
            <TouchableOpacity
              onPress={showCall}
              accessibilityRole="button"
              style={callStyles.returnButton}
            >
              <Text style={callStyles.returnText}>
                Call in progress · Tap to return
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        )}
        <AppUpdateGate
          enabled={!activeCall && !deferUpdatesOn.has(activeScreen)}
        >
          <StatusBar
            backgroundColor={statusBarAppearance.backgroundColor}
            barStyle={statusBarAppearance.barStyle}
          />
          <RootStack />
        </AppUpdateGate>
        <IncomingCallModal
          visible={Boolean(
            incomingRoom && activeScreen !== 'OnlineRoom' && !activeCall,
          )}
          onAccept={acceptIncomingCall}
          onDecline={declineIncomingCall}
          userName={incomingRoom?.male?.name || 'N/A'}
          avatar=""
        />
        {activeCall && (
          <View
            style={[callStyles.call, !visible && callStyles.hidden]}
            pointerEvents={visible ? 'auto' : 'none'}
          >
            <CallScreen
              route={activeCall}
              visible={visible}
              onMinimize={minimizeCall}
              onFinished={clearCall}
            />
          </View>
        )}
      </View>
    </NavigationContainer>
  );
}

export default function App({ isHeadless = false }: { isHeadless?: boolean }) {
  React.useEffect(() => {
    if (!isHeadless) return startPushNotifications();
  }, [isHeadless]);
  if (isHeadless) return null;
  return (
    <SafeAreaProvider>
      <UserProvider>
        <ActiveCallProvider>
          <AppNavigator />
        </ActiveCallProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}

const callStyles = StyleSheet.create({
  root: { flex: 1 },
  call: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
  },
  hidden: { display: 'none' },
  bar: { backgroundColor: '#126B42' },
  returnButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  returnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
