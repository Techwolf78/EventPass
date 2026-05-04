import React from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <TouchableOpacity
      onPress={logout}
      activeOpacity={0.7}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#fef2f2',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fecaca',
        marginRight: 8,
      }}
    >
      <Ionicons name="log-out-outline" size={18} color="#ef4444" />
    </TouchableOpacity>
  );
}

const RegisterTabIcon = ({ color }: { color: string }) => (
  <Ionicons name="person-add" size={24} color={color} />
);

const AgendaTabIcon = ({ color }: { color: string }) => (
  <Ionicons name="calendar" size={24} color={color} />
);

const PassTabIcon = ({ color }: { color: string }) => (
  <Ionicons name="qr-code" size={24} color={color} />
);

const NotificationsTabIcon = ({ color }: { color: string }) => (
  <Ionicons name="notifications" size={24} color={color} />
);

export default function AttendeeLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerTitle: '',
        headerRight: () => <LogoutButton />,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: 56 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom || 10,
        },
        tabBarActiveTintColor: '#7c3aed',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
        headerStyle: {
          backgroundColor: 'transparent',
        },
      }}
    >
      <Tabs.Screen
        name="register"
        options={{
          title: 'Register',
          headerShown: true,
          tabBarIcon: RegisterTabIcon,
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          headerShown: true,
          tabBarIcon: AgendaTabIcon,
        }}
      />
      <Tabs.Screen
        name="qr-pass"
        options={{
          title: 'My Pass',
          headerShown: true,
          tabBarIcon: PassTabIcon,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          headerShown: true,
          tabBarIcon: NotificationsTabIcon,
        }}
      />
    </Tabs>
  );
}
