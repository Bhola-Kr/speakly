import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';

import HomeScreen from './home/HomeScreen';
import RecentScreen from './recentScreen/RecentScreen';
import Colors from '../constants/colors';

const Tab = createBottomTabNavigator();

const BottomTabs = () => {
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
          bottom: 18,
          marginHorizontal: 10,

          height: 68,

          backgroundColor: '#1C1C1C',

          borderRadius: 34,

          borderTopWidth: 0,

          elevation: 15,

          shadowColor: '#000',
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

        tabBarInactiveTintColor: '#8F8F8F',

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginBottom: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={focused ? Colors.secondary : '#8F8F8F'}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Recents"
        component={RecentScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={22}
              color={focused ? Colors.secondary : '#8F8F8F'}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabs;
