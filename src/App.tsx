import * as React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import BirthYearScreen from './screens/BirthYearScreen';
import NicknameScreen from './screens/NicknameScreen';
import OtpScreen from './screens/OtpScreen';
import GenderScreen from './screens/GenderScreen';
import LanguageScreen from './screens/LanguageScreen';
import AvatarScreen from './screens/AvatarScreen';
import AudioVerificationScreen from './screens/AudioVerificationScreen';
import BottomTabs from './screens/BottomTabs';
import Colors from './constants/colors';
import ProfileScreen from './screens/profile';
import { EditProfileScreen } from './screens/profile/EditProfileScreen';
import WalletScreen from './screens/payment/WalletScreen';
import TransactionScreen from './screens/payment/TransactionScreen';
import CallScreen from './screens/agora';
import IncomingCallScreen from './screens/agora/incomingCall/IncomingCallScreen';
import OutgoingCallScreen from './screens/agora/outgoingCall/OutgoingCallScreen';
import HistoryScreen from './screens/HistoryScreen';
import FemaleHomeScreen from './screens/FemaleHomeScreen';
import FemaleBottomTabs from './screens/FemaleBottomTabs';

const Stack = createNativeStackNavigator();

function RootStack() {
  return (
    <Stack.Navigator
      initialRouteName="FemaleBottomTabs"
      screenOptions={{
        headerShown: false,
      }}
    >
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
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Transaction" component={TransactionScreen} />
      <Stack.Screen name="Call" component={CallScreen} />
      <Stack.Screen name="IncomingCall" component={IncomingCallScreen} />
      <Stack.Screen name="OutgoingCall" component={OutgoingCallScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="FemaleHome" component={FemaleHomeScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      <RootStack />
    </NavigationContainer>
  );
}
