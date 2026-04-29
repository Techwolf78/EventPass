import React from 'react';
import { Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AttendeeLayout() {
  const { logout } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerRight: () => (
          <TouchableOpacity onPress={logout} style={{ marginRight: 16 }}>
            <Ionicons name="log-out" size={24} color="#007AFF" />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen
        name="register"
        options={{
          title: 'Registration',
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="qr-pass"
        options={{
          title: 'Your QR Pass',
        }}
      />
      <Stack.Screen
        name="agenda"
        options={{
          title: 'Event Agenda',
        }}
      />
    </Stack>
  );
}
