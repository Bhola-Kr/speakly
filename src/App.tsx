import * as React from 'react';
import {
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
import { UserProvider } from './hooks/UserContext';
import PaymentScreen from './screens/payment/PaymentScreen';
import AppUpdateGate from './components/appUpdate/AppUpdateGate';
import { startPushNotifications } from './notifications/pushNotifications';
import { AdminUsersScreen } from './screens/admin/AdminUsersScreen';

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
  const { activeCall, visible, showCall, minimizeCall, clearCall } =
    useActiveCall();
  const syncActiveScreen = () =>
    setActiveScreen(navigationRef.getCurrentRoute()?.name ?? 'Splash');
  const openRecharge = React.useCallback(() => {
    minimizeCall();
    if (navigationRef.isReady()) {
      navigationRef.navigate('Wallet');
    }
  }, [minimizeCall]);

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
            backgroundColor={Colors.background}
            barStyle="dark-content"
          />
          <RootStack />
        </AppUpdateGate>
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
              onAddBalance={openRecharge}
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
