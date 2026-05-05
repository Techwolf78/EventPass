import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

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

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isLarge = width >= 800;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerTitle: '',
        headerRight: () => <LogoutButton />,
        tabBarActiveTintColor: '#8b5cf6', // Neon Purple
        tabBarInactiveTintColor: '#64748b', // Slate 500
        headerStyle: {
          backgroundColor: 'transparent',
        },
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopWidth: 1,
          borderTopColor: '#334155',
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
          ...Platform.select({
            web: {
              boxShadow: '0 -4px 10px rgba(0,0,0,0.3)',
            },
            default: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
            },
          }),
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
      }}
    >
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scanner',
          headerRight: () => null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="qr-code" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="panel"
        options={{
          title: 'Dashboard',
          headerRight: () => null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="guests"
        options={{
          title: 'Guests',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
