import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthStack, StudentStack, DriverStack, AdminStack } from '@/navigation/types';
import { colors } from '@/theme';

import LoginScreen from '@/screens/auth/LoginScreen';
import StudentTabsNavigator from '@/navigation/StudentTabs';
import DriverTabsNavigator from '@/navigation/DriverTabs';
import AdminTabsNavigator from '@/navigation/AdminTabs';
import StudentMapScreen from '@/screens/student/StudentMapScreen';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    primary: colors.primary,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
      </AuthStack.Navigator>
    );
  }

  if (user.role === 'student') {
    return (
      <StudentStack.Navigator screenOptions={{ headerShown: false }}>
        <StudentStack.Screen name="StudentTabs" component={StudentTabsNavigator} />
        <StudentStack.Screen
          name="StudentMap"
          component={StudentMapScreen}
          options={{ headerShown: true, title: 'Live Shuttle', headerTintColor: colors.text }}
        />
      </StudentStack.Navigator>
    );
  }

  if (user.role === 'driver') {
    return (
      <DriverStack.Navigator screenOptions={{ headerShown: false }}>
        <DriverStack.Screen name="DriverTabs" component={DriverTabsNavigator} />
      </DriverStack.Navigator>
    );
  }

  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen name="AdminTabs" component={AdminTabsNavigator} />
    </AdminStack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="dark" />
          <Root />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
