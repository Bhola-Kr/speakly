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
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  createNavigationContainerRef,
  NavigationContainer,
  ParamListBase,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import OtpScreen from './screens/OtpScreen';
import GenderScreen from './screens/GenderScreen';
import OnboardingPreferencesScreen from './screens/OnboardingPreferencesScreen';
import AudioVerificationScreen from './screens/AudioVerificationScreen';
import AvatarScreen from './screens/AvatarScreen';
import BottomTabs from './screens/BottomTabs';
import Colors from './constants/colors';
import UI from './constants/ui';
import { SUPPORT_EMAIL } from './constants/constants';
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
import AboutScreen from './screens/AboutScreen';
import FAQScreen from './screens/FAQScreen';
import SplashScreen from './screens/SplashScreen';
import OnlineRoomScreen from './screens/agora/OnlineRoomScreen';
import { UserProvider, useUser } from './hooks/UserContext';
import AppUpdateGate from './components/appUpdate/AppUpdateGate';
import {
  ACCEPTED_CALL_EVENT,
  cancelIncomingCallNotification,
  consumePendingAcceptedCall,
  displayIncomingCallNotification,
  startPushNotifications,
} from './notifications/pushNotifications';
import { AdminUsersScreen } from './screens/admin/AdminUsersScreen';
import IncomingCallModal from './screens/agora/IncomingCallModal';
import RoomService, { Room } from './firebase/RoomService';
import database from '@react-native-firebase/database';
import { databaseRef } from './firebase/firebase';
import AppAlert from './components/AppAlert';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef<ParamListBase>();
// Checkout SDK activities can temporarily recreate the React root surface on
// Android without killing the JS process. Keep the navigation tree outside the
// component so that returning from PayU resumes the current screen instead of
// starting again at Splash.
let retainedNavigationState: any;
const deferUpdatesOn = new Set([
  'Splash',
  'Call',
  'IncomingCall',
  'OutgoingCall',
  'OnlineRoom',
]);

const getStatusBarAppearance = (screen: string) => {
  if (screen === 'IncomingCall' || screen === 'OutgoingCall') {
    return { backgroundColor: Colors.navy, barStyle: 'light-content' as const };
  }
  if (screen === 'Splash' || screen === 'Call' || screen === 'OnlineRoom') {
    return {
      backgroundColor: Colors.primary,
      barStyle: 'light-content' as const,
    };
  }
  return {
    backgroundColor: Colors.background,
    barStyle: 'dark-content' as const,
  };
};

function RootStack() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen
        name="OnboardingPreferences"
        component={OnboardingPreferencesScreen}
      />
      <Stack.Screen name="Gender" component={GenderScreen} />
      <Stack.Screen
        name="AudioVerification"
        component={AudioVerificationScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="Avatar" component={AvatarScreen} />
      <Stack.Screen
        name="Main"
        component={BottomTabs}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="FemaleBottomTabs"
        component={FemaleBottomTabs}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="ProfileSetting" component={ProfileSettingScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'About Speakly',
        }}
        name="About"
        component={AboutScreen}
      />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
        name="EditProfile"
        component={EditProfileScreen}
      />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Transaction" component={TransactionScreen} />
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
          title: 'Terms & Conditions',
        }}
        name="TermsAndConditions"
        component={TermsAndConditionsScreen}
      />
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Privacy Policy',
        }}
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
      />
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Help & FAQ',
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
  const [deletionNoticeDismissed, setDeletionNoticeDismissed] =
    React.useState(false);
  const { activeCall, visible, showCall, minimizeCall, clearCall } =
    useActiveCall();
  const deletionRequest = user?.accountDeletion;
  const deletionRequested = deletionRequest?.status === true;
  const deletionDate = Number(deletionRequest?.scheduledDeletionAt || 0);

  React.useEffect(() => {
    setDeletionNoticeDismissed(false);
  }, [user?.uid, deletionRequest?.requestedAt]);

  const contactDeletionAdmin = React.useCallback(() => {
    const subject = encodeURIComponent('Account Deletion Support');
    const body = encodeURIComponent(`Hello Speakly Support Team,

I need help with my pending account deletion request.

User ID: ${user?.uid || 'N/A'}
Registered Mobile: ${user?.phone || user?.profile?.phone || 'N/A'}

Thank you.`);
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`,
    ).catch(() => {
      Alert.alert(
        'Contact Admin',
        `Please email ${SUPPORT_EMAIL} for assistance.`,
      );
    });
  }, [user?.phone, user?.profile?.phone, user?.uid]);
  const statusBarAppearance = React.useMemo(
    () => getStatusBarAppearance(activeScreen),
    [activeScreen],
  );
  const femaleUid = user?.isExpert === true ? String(user?.uid || '') : '';
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
              console.warn(
                'Unable to clear incoming call notification:',
                error,
              ),
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
          maleGender: room.male?.gender,
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
    const snapshot = await databaseRef(`rooms/${femaleUid}`).once('value');
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
      maleGender: room.male?.gender,
      femaleUid,
      uid: room.roomId,
      agora: room.agora,
    });
  }, [activeCall, femaleUid]);

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

  return (
    <NavigationContainer
      ref={navigationRef}
      initialState={retainedNavigationState}
      onReady={syncActiveScreen}
      onStateChange={state => {
        retainedNavigationState = state;
        syncActiveScreen();
      }}
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
        <Modal
          visible={deletionRequested && !deletionNoticeDismissed}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setDeletionNoticeDismissed(true)}
        >
          <View style={callStyles.deletionOverlay}>
            <View style={callStyles.deletionCard}>
              <Text style={callStyles.deletionTitle}>
                Account Under Deletion
              </Text>
              <Text style={callStyles.deletionText}>
                Your deletion request has been received. Your account data is
                still retained and will be reviewed for deletion within 15 days.
                {deletionDate
                  ? `\n\nScheduled by: ${new Date(
                      deletionDate,
                    ).toLocaleDateString('en-IN')}`
                  : ''}
              </Text>
              <TouchableOpacity
                style={callStyles.deletionPrimaryButton}
                onPress={contactDeletionAdmin}
              >
                <Text style={callStyles.deletionPrimaryText}>
                  Contact Admin
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={callStyles.deletionSecondaryButton}
                onPress={() => setDeletionNoticeDismissed(true)}
              >
                <Text style={callStyles.deletionSecondaryText}>
                  I Understand
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
          <AppAlert />
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
  bar: { backgroundColor: Colors.tealDark },
  returnButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  returnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  deletionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    justifyContent: 'center',
    paddingHorizontal: UI.spacing.xl,
  },
  deletionCard: {
    borderRadius: UI.radius.alert,
    backgroundColor: Colors.white,
    padding: UI.spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...UI.shadow.modal,
  },
  deletionTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  deletionText: {
    color: Colors.subText,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 22,
  },
  deletionPrimaryButton: {
    minHeight: 48,
    borderRadius: UI.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  deletionPrimaryText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  deletionSecondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  deletionSecondaryText: {
    color: Colors.subText,
    fontSize: 14,
    fontWeight: '600',
  },
});
