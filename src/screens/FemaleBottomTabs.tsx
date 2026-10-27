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

          left: 16,
          right: 16,
          bottom: Math.max(insets.bottom, 12),

          height: 72,

          backgroundColor: Colors.white,

          borderRadius: 24,

          borderTopWidth: 0,

          borderWidth: 1,
          borderColor: Colors.border,
          elevation: 12,

          shadowColor: Colors.primary,
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: 0.14,
          shadowRadius: 18,
        },

        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },

        tabBarActiveTintColor: Colors.secondary,

        tabBarInactiveTintColor: Colors.gray143,

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          marginBottom: 6,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={FemaleHomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={focused ? Colors.secondary : Colors.gray143}
            />
          ),
        }}
      />

      <Tab.Screen
        name="History"
        component={FemaleHistoryScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={22}
              color={focused ? Colors.secondary : Colors.gray143}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default FemaleBottomTabs;
