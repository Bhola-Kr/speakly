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

const Stack = createNativeStackNavigator();

function RootStack() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="BirthYear" component={BirthYearScreen} />
      <Stack.Screen name="Nickname" component={NicknameScreen} />
      <Stack.Screen name="Gender" component={GenderScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="Avatar" component={AvatarScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <RootStack />
    </NavigationContainer>
  );
}
