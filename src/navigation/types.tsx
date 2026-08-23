import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

export type AuthStackParamList = {
  Login: undefined;
};

export type StudentStackParamList = {
  StudentTabs: undefined;
  StudentMap: undefined;
};

export type StudentTabParamList = {
  Home: undefined;
  Map: undefined;
  Profile: undefined;
};

export type DriverStackParamList = {
  DriverTabs: undefined;
};

export type DriverTabParamList = {
  Dashboard: undefined;
  LiveMap: undefined;
  Manifest: undefined;
  Profile: undefined;
};

export type AdminStackParamList = {
  AdminTabs: undefined;
};

export type AdminTabParamList = {
  Provision: undefined;
  Stops: undefined;
  History: undefined;
  Settings: undefined;
};

export const AuthStack = createNativeStackNavigator<AuthStackParamList>();
export const StudentStack = createNativeStackNavigator<StudentStackParamList>();
export const StudentTabs = createBottomTabNavigator<StudentTabParamList>();
export const DriverStack = createNativeStackNavigator<DriverStackParamList>();
export const DriverTabs = createBottomTabNavigator<DriverTabParamList>();
export const AdminStack = createNativeStackNavigator<AdminStackParamList>();
export const AdminTabs = createBottomTabNavigator<AdminTabParamList>();

export const tabIcon =
  (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: string; size: number }) =>
    <Ionicons name={name} color={color} size={size} />;

export const TAB_ACTIVE = colors.primary;
export const TAB_INACTIVE = colors.textMuted;
