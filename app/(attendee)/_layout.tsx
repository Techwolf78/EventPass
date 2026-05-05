import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWindowDimensions, Platform } from 'react-native';

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
  const { width } = useWindowDimensions();
  const isLarge = width >= 600;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerTitle: '',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          height: Platform.OS === 'ios' ? 90 : 75 + (insets.bottom > 0 ? insets.bottom : 10),
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : (insets.bottom > 0 ? insets.bottom : 10),
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          alignSelf: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 30,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
          paddingHorizontal: 2,
          width: '100%',
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarHideOnKeyboard: true,
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