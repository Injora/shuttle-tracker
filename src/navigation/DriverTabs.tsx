import React from 'react';
import { DriverTabs, tabIcon, TAB_ACTIVE, TAB_INACTIVE } from '@/navigation/types';
import { colors } from '@/theme';

import DriverDashboardScreen from '@/screens/driver/DriverDashboardScreen';
import DriverLiveMapScreen from '@/screens/driver/DriverLiveMapScreen';
import DriverManifestScreen from '@/screens/driver/DriverManifestScreen';
import DriverProfileScreen from '@/screens/driver/DriverProfileScreen';

export default function DriverTabsNavigator() {
  return (
    <DriverTabs.Navigator
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
      <DriverTabs.Screen
        name="Dashboard"
        component={DriverDashboardScreen}
        options={{ tabBarIcon: tabIcon('speedometer-outline'), tabBarLabel: 'Dashboard' }}
      />
      <DriverTabs.Screen
        name="LiveMap"
        component={DriverLiveMapScreen}
        options={{ tabBarIcon: tabIcon('navigate-outline'), tabBarLabel: 'Live Map' }}
      />
      <DriverTabs.Screen
        name="Manifest"
        component={DriverManifestScreen}
        options={{ tabBarIcon: tabIcon('list-outline'), tabBarLabel: 'Manifest' }}
      />
      <DriverTabs.Screen
        name="Profile"
        component={DriverProfileScreen}
        options={{ tabBarIcon: tabIcon('person-outline'), tabBarLabel: 'Profile' }}
      />
    </DriverTabs.Navigator>
  );
}
