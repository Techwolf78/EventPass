import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'alert' | 'success' | 'reminder';
  read: boolean;
  actions?: { label: string; type: 'primary' | 'secondary' }[];
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: 'Thanks for Joining!',
          message: 'The InnovateSummit recap is ready \u2014 slides, recordings, and key highlights are waiting for you.',
          timestamp: 'Just now',
          type: 'success',
          read: false,
          actions: [
            { label: 'View Recap', type: 'primary' },
            { label: 'Dismiss', type: 'secondary' },
          ],
        },
        {
          id: '2',
          title: 'Session Starting Soon',
          message: 'Future of AI in Enterprise starts in 10 minutes.',
          timestamp: '10 min ago',
          type: 'reminder',
          read: false,
        },
        {
          id: '3',
          title: 'Registration Confirmed',
          message: 'Your QR pass for InnovateSummit is ready.',
          timestamp: '2 hours ago',
          type: 'success',
          read: true,
        },
      ];
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'alert':
        return 'alert-circle';
      case 'reminder':
        return 'time';
      default:
        return 'information-circle';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'alert':
        return '#ef4444';
      case 'reminder':
        return '#f59e0b';
      default:
        return '#7c3aed';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map((notif) =>
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const dismissNotification = (id: string) => {
    setNotifications(notifications.filter((notif) => notif.id !== id));
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>Notifications</Text>
          {notifications.length > 0 && (
            <Text style={styles.notifCount}>
              {notifications.filter((n) => !n.read).length} new
            </Text>
          )}
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="notifications-off" size={48} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>
              You're all caught up! Come back later for updates.
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  !notification.read && styles.notificationCardUnread,
                ]}
                onPress={() => markAsRead(notification.id)}
                activeOpacity={0.7}
              >
                <View style={styles.notificationHeader}>
                  <View style={[
                    styles.notificationIconBg,
                    { backgroundColor: `${getNotificationColor(notification.type)}15` },
                  ]}>
                    <Ionicons
                      name={getNotificationIcon(notification.type) as any}
                      size={22}
                      color={getNotificationColor(notification.type)}
                    />
                  </View>
                  <View style={styles.notificationContent}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[
                          styles.notificationTitle,
                          !notification.read && styles.notificationTitleBold,
                        ]}
                        numberOfLines={1}
                      >
                        {notification.title}
                      </Text>
                      {!notification.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.notificationTimestamp}>
                      {notification.timestamp}
                    </Text>
                  </View>
                </View>

                <Text style={styles.notificationMessage} numberOfLines={3}>
                  {notification.message}
                </Text>

                {/* Action Buttons */}
                {notification.actions && notification.actions.length > 0 && (
                  <View style={styles.actionRow}>
                    {notification.actions.map((action, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.actionBtn,
                          action.type === 'primary'
                            ? styles.actionBtnPrimary
                            : styles.actionBtnSecondary,
                        ]}
                        onPress={() => {
                          if (action.label === 'Dismiss') {
                            dismissNotification(notification.id);
                          }
                          markAsRead(notification.id);
                        }}
                      >
                        <Text
                          style={[
                            styles.actionBtnText,
                            action.type === 'primary'
                              ? styles.actionBtnTextPrimary
                              : styles.actionBtnTextSecondary,
                          ]}
                          numberOfLines={1}
                        >
                          {action.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  // Screen Header
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
  },
  notifCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7c3aed',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    fontWeight: '500',
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 20,
  },
  // Notifications List
  notificationsList: {
    gap: 10,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  notificationCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#7c3aed',
    backgroundColor: '#fff',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  notificationIconBg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  notificationContent: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    flexShrink: 1,
  },
  notificationTitleBold: {
    fontWeight: '800',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7c3aed',
    marginLeft: 8,
    flexShrink: 0,
  },
  notificationTimestamp: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 19,
    fontWeight: '500',
    marginBottom: 4,
  },
  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: '#7c3aed',
  },
  actionBtnSecondary: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtnTextPrimary: {
    color: '#fff',
  },
  actionBtnTextSecondary: {
    color: '#6b7280',
  },
});
