import React from 'react';
import { StudentTabs, tabIcon, TAB_ACTIVE, TAB_INACTIVE } from '@/navigation/types';
import { colors } from '@/theme';

import StudentHomeScreen from '@/screens/student/StudentHomeScreen';
import StudentMapScreen from '@/screens/student/StudentMapScreen';
import StudentProfileScreen from '@/screens/student/StudentProfileScreen';

export default function StudentTabsNavigator() {
  return (
    <StudentTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <StudentTabs.Screen
        name="Home"
        component={StudentHomeScreen}
        options={{ tabBarIcon: tabIcon('home-outline'), tabBarLabel: 'Home' }}
      />
      <StudentTabs.Screen
        name="Map"
        component={StudentMapScreen}
        options={{ tabBarIcon: tabIcon('map-outline'), tabBarLabel: 'Map' }}
      />
      <StudentTabs.Screen
        name="Profile"
        component={StudentProfileScreen}
        options={{ tabBarIcon: tabIcon('person-outline'), tabBarLabel: 'Profile' }}
      />
    </StudentTabs.Navigator>
  );
}
