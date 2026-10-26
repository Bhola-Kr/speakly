import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Colors from '../constants/colors';
import FemaleHomeScreen from './FemaleHomeScreen';
import FemaleHistoryScreen from './FemaleHistoryScreen';

const Tab = createBottomTabNavigator();

const FemaleBottomTabs = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,

        tabBarShowLabel: true,

        tabBarHideOnKeyboard: true,

        tabBarStyle: {
          position: 'absolute',

          left: 20,
          right: 20,
          bottom: Math.max(insets.bottom, 18),
          marginHorizontal: 10,

          height: 68,

          backgroundColor: Colors.darkSurfaceElevated,

          borderRadius: 34,

          borderTopWidth: 0,

          elevation: 15,

          shadowColor: Colors.black,
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: 0.25,
          shadowRadius: 12,
        },

        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },

        tabBarActiveTintColor: Colors.secondary,

        tabBarInactiveTintColor: Colors.gray143,

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginBottom: 4,
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
