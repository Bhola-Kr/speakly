import React, { useCallback } from 'react';
import { BackHandler, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import HomeScreen from './home/HomeScreen';
import ManHistoryScreen from './recentScreen/ManHistoryScreen';
import NoFeedbackTabButton from '../components/NoFeedbackTabButton';
import Colors from '../constants/colors';

const Tab = createBottomTabNavigator();

const TAB_COLORS = {
  teal: Colors.primary,
  tealDark: Colors.primaryPressed,
  mint: Colors.primaryLight,
  gray: Colors.offline,
  white: Colors.surface,
  border: Colors.border,
};

const HomeTabIcon = ({ focused }: { focused: boolean }) => (
  <View style={focused && tabIconStyles.activePill}>
    <Ionicons
      name={focused ? 'home' : 'home-outline'}
      size={focused ? 29 : 25}
      color={focused ? TAB_COLORS.teal : TAB_COLORS.gray}
    />
  </View>
);

const RecentsTabIcon = ({ focused }: { focused: boolean }) => (
  <View style={focused && tabIconStyles.activePill}>
    <Ionicons
      name={focused ? 'time' : 'time-outline'}
      size={focused ? 29 : 25}
      color={focused ? TAB_COLORS.teal : TAB_COLORS.gray}
    />
  </View>
);

const tabIconStyles = {
  activePill: {
    width: 58,
    height: 39,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: TAB_COLORS.mint,
  },
};

const BottomTabs = ({ route }: any) => {
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          BackHandler.exitApp();
          return true;
        },
      );

      return () => subscription.remove();
    }, []),
  );

  return (
    <Tab.Navigator
      backBehavior="initialRoute"
      screenOptions={{
        headerShown: false,

        tabBarShowLabel: true,

        tabBarHideOnKeyboard: true,

        tabBarButton: NoFeedbackTabButton,

        tabBarStyle: {
          position: 'absolute',

          left: 0,
          right: 0,
          bottom: 0,

          height: 76 + insets.bottom,
          paddingTop: 9,
          paddingBottom: Math.max(insets.bottom, 8),

          backgroundColor: TAB_COLORS.white,

          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,

          borderTopWidth: 0,

          borderWidth: 1,
          borderColor: TAB_COLORS.border,
          elevation: 6,

          shadowColor: TAB_COLORS.tealDark,
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },

        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 2,
        },

        tabBarActiveTintColor: TAB_COLORS.tealDark,

        tabBarInactiveTintColor: TAB_COLORS.gray,

        tabBarLabelStyle: {
          fontSize: 13,
          lineHeight: 16,
          fontWeight: '800',
          marginTop: 3,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        initialParams={{ pendingCall: route?.params?.pendingCall }}
        options={{
          tabBarIcon: HomeTabIcon,
        }}
      />

      <Tab.Screen
        name="Recents"
        component={ManHistoryScreen}
        options={{
          tabBarIcon: RecentsTabIcon,
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabs;
