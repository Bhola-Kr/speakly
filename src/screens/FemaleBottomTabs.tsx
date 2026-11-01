import React, { useCallback } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Colors from '../constants/colors';
import FemaleHomeScreen from './FemaleHomeScreen';
import FemaleHistoryScreen from './FemaleHistoryScreen';
import NoFeedbackTabButton from '../components/NoFeedbackTabButton';

const Tab = createBottomTabNavigator();

const ACTIVE_TEAL = '#08A98F';
const ACTIVE_SURFACE = '#DFF9F4';

const HomeTabIcon = ({ focused }: { focused: boolean }) => (
  <View style={[styles.iconWrap, focused && styles.activeIconWrap]}>
    <Ionicons
      name={focused ? 'home' : 'home-outline'}
      size={25}
      color={focused ? ACTIVE_TEAL : Colors.gray143}
    />
  </View>
);

const HistoryTabIcon = ({ focused }: { focused: boolean }) => (
  <View style={[styles.iconWrap, focused && styles.activeIconWrap]}>
    <Ionicons
      name={focused ? 'time' : 'time-outline'}
      size={25}
      color={focused ? ACTIVE_TEAL : Colors.gray143}
    />
  </View>
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

        tabBarButton: NoFeedbackTabButton,

        tabBarStyle: {
          position: 'absolute',

          left: 0,
          right: 0,
          bottom: 0,

          height: 78 + insets.bottom,
          paddingTop: 7,
          paddingBottom: Math.max(insets.bottom, 8),

          backgroundColor: Colors.white,

          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,

          borderTopWidth: 0,

          borderWidth: 0,
          elevation: 10,

          shadowColor: '#0B5E55',
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: 0.09,
          shadowRadius: 18,
        },

        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 2,
        },

        tabBarActiveTintColor: ACTIVE_TEAL,

        tabBarInactiveTintColor: Colors.gray143,

        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 14,
          fontWeight: '700',
          marginTop: 5,
        },
        tabBarIconStyle: {
          marginTop: 0,
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

const styles = StyleSheet.create({
  iconWrap: {
    width: 42,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrap: {
    backgroundColor: ACTIVE_SURFACE,
  },
});
