import React from 'react';
import { AdminTabs, tabIcon, TAB_ACTIVE, TAB_INACTIVE } from '@/navigation/types';
import { colors } from '@/theme';

import AdminProvisionScreen from '@/screens/admin/AdminProvisionScreen';
import AdminStopsScreen from '@/screens/admin/AdminStopsScreen';
import AdminHistoryScreen from '@/screens/admin/AdminHistoryScreen';
import AdminSettingsScreen from '@/screens/admin/AdminSettingsScreen';

export default function AdminTabsNavigator() {
  return (
    <AdminTabs.Navigator
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
      <AdminTabs.Screen
        name="Provision"
        component={AdminProvisionScreen}
        options={{ tabBarIcon: tabIcon('people-outline'), tabBarLabel: 'Accounts' }}
      />
      <AdminTabs.Screen
        name="Stops"
        component={AdminStopsScreen}
        options={{ tabBarIcon: tabIcon('location-outline'), tabBarLabel: 'Stops' }}
      />
      <AdminTabs.Screen
        name="History"
        component={AdminHistoryScreen}
        options={{ tabBarIcon: tabIcon('time-outline'), tabBarLabel: 'History' }}
      />
      <AdminTabs.Screen
        name="Settings"
        component={AdminSettingsScreen}
        options={{ tabBarIcon: tabIcon('settings-outline'), tabBarLabel: 'Settings' }}
      />
    </AdminTabs.Navigator>
  );
}
