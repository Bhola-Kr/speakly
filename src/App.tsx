import * as React from 'react';
import { AppState, AppStateStatus, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
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
import authData from './firebase/authData';

import { OTPWidget } from '@msg91comm/sendotp-react-native';

const WIDGET_ID = '366861655a61323136323339';
const AUTH_TOKEN = '556220TeXCG9I0Yc6a6d8b8cP1';

const Stack = createNativeStackNavigator();

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
      <Stack.Screen name="Call" component={CallScreen} />
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

export default function App() {
  const appState = React.useRef(AppState.currentState);

  React.useEffect(() => {
    OTPWidget.initializeWidget(WIDGET_ID, AUTH_TOKEN);
    const subscription = AppState.addEventListener(
      'change',
      async (nextState: AppStateStatus) => {
        if (!authData.getCurrentUser()) {
          return;
        }
        if (nextState === 'background' || nextState === 'inactive') {
          await authData.updateProfile({ status: 'Offline' });
        }
        appState.current = nextState;
      },
    );

    return () => subscription.remove();
  }, []);

  return (
    <UserProvider>
      <NavigationContainer>
        <StatusBar
          backgroundColor={Colors.background}
          barStyle="dark-content"
        />
        <RootStack />
      </NavigationContainer>
    </UserProvider>
  );
}
