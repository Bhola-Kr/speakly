import React, { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Colors from '../constants/colors';
import FemaleHomeScreen from './FemaleHomeScreen';
import FemaleHistoryScreen from './FemaleHistoryScreen';

const Tab = createBottomTabNavigator();

const HomeTabIcon = ({ focused }: { focused: boolean }) => (
  <Ionicons
    name={focused ? 'home' : 'home-outline'}
    size={24}
    color={focused ? Colors.secondary : Colors.gray143}
  />
);

const HistoryTabIcon = ({ focused }: { focused: boolean }) => (
  <Ionicons
    name={focused ? 'time' : 'time-outline'}
    size={24}
    color={focused ? Colors.secondary : Colors.gray143}
  />
);

const FemaleBottomTabs = () => {
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

        tabBarStyle: {
          position: 'absolute',

          left: 12,
          right: 12,
          bottom: 0,

          height: 68 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),

          backgroundColor: Colors.white,

          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,

          borderTopWidth: 0,

          borderWidth: 1,
          borderColor: Colors.border,
          elevation: 6,

          shadowColor: Colors.primary,
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

        tabBarActiveTintColor: Colors.secondary,

        tabBarInactiveTintColor: Colors.gray143,

        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 14,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={FemaleHomeScreen}
        options={{
          tabBarIcon: HomeTabIcon,
        }}
      />

      <Tab.Screen
        name="History"
        component={FemaleHistoryScreen}
        options={{
          tabBarIcon: HistoryTabIcon,
        }}
      />
    </Tab.Navigator>
  );
};

export default FemaleBottomTabs;
