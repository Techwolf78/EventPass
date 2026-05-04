import React from 'react';
import { Tabs, Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';

const LogoutButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={{ marginRight: 16 }}>
    <Ionicons name="log-out" size={24} color="#007AFF" />
  </TouchableOpacity>
);

const AgendaTabIcon = ({ color }: { color: string }) => (
  <Ionicons name="list" size={24} color={color} />
);

const PassTabIcon = ({ color }: { color: string }) => (
  <Ionicons name="qr-code" size={24} color={color} />
);

const NotificationsTabIcon = ({ color }: { color: string }) => (
  <Ionicons name="notifications" size={24} color={color} />
);

export default function AttendeeLayout() {
  const { logout } = useAuth();
  const route = useRoute();

  // Show Stack layout for registration, otherwise use Tabs
  if (route.name === 'register') {
    return (
      <Stack
        screenOptions={{
          headerShown: true,
          headerRight: () => <LogoutButton onPress={logout} />,
        }}
      >
        <Stack.Screen
          name="register"
          options={{
            title: 'Registration',
            headerBackVisible: false,
          }}
        />
      </Stack>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerRight: () => <LogoutButton onPress={logout} />,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#06b6d4',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          headerTitle: 'Event Agenda',
          tabBarIcon: AgendaTabIcon,
        }}
      />
      <Tabs.Screen
        name="qr-pass"
        options={{
          title: 'My Pass',
          headerTitle: 'Your QR Pass',
          tabBarIcon: PassTabIcon,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          headerTitle: 'Notifications',
          tabBarIcon: NotificationsTabIcon,
        }}
      />
    </Tabs>
  );
}
