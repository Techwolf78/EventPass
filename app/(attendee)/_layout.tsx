import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const AttendeesTabIcon = ({ color }: { color: string }) => (
  <Ionicons name="people" size={24} color={color} />
);

const AgendaTabIcon = ({ color }: { color: string }) => (
  <Ionicons name="calendar" size={24} color={color} />
);

const PassTabIcon = ({ color }: { color: string }) => (
  <Ionicons name="qr-code" size={24} color={color} />
);

const ProfileTabIcon = ({ color }: { color: string }) => (
  <Ionicons name="person" size={24} color={color} />
);

export default function AttendeeLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerTitle: '',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          height: 70,
          paddingTop: 8,
          paddingBottom: 10,
          position: 'absolute',
          bottom: insets.bottom || 16,
          left: 16,
          right: 16,
          borderRadius: 32,
          shadowColor: '#6366f1',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 10,
        },
        tabBarActiveTintColor: '#6366f1', // Matches new Indigo primary
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 4,
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
        name="attendees"
        options={{
          title: 'Attendees',
          headerShown: true,
          tabBarIcon: AttendeesTabIcon,
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
        name="profile"
        options={{
          title: 'Profile',
          headerShown: true,
          tabBarIcon: ProfileTabIcon,
        }}
      />

      <Tabs.Screen
        name="register"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}