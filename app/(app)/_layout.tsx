import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Platform, View, Text, Pressable } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { canAccessModule } from '@/utils/permissions';
import { useOrdersRealtime } from '@/hooks/useRealtime';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    dashboard: '📊',
    orders: '📋',
    delivery: '🚚',
    process: '⚙️',
    inventory: '📦',
    sales: '💰',
    staff: '👥',
    archive: '🗂️',
  };
  return (
    <Text className={`text-lg ${focused ? 'opacity-100' : 'opacity-50'}`}>
      {icons[name] ?? '📄'}
    </Text>
  );
}

export default function AppLayout() {
  const { session, user, isLoading } = useAuth();

  // Enable real-time subscriptions for all web users
  useOrdersRealtime();
  // Enable offline sync for mobile
  useOfflineSync();

  if (isLoading) {
    return <LoadingSpinner message="Loading your account..." />;
  }

  if (!session || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  const role = user.role;

  const tabs = [
    { name: 'dashboard', title: 'Dashboard' },
    { name: 'orders/index', title: 'Orders' },
    { name: 'delivery/index', title: 'Delivery' },
    { name: 'process/index', title: 'Process' },
    { name: 'inventory/index', title: 'Inventory' },
    { name: 'sales/index', title: 'Sales' },
    { name: 'staff/index', title: 'Staff' },
    { name: 'archive/index', title: 'Archive' },
  ];

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0ea5e9' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          height: Platform.OS === 'ios' ? 85 : 65,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          headerTitle: 'CJ Water Station',
          tabBarIcon: ({ focused }) => <TabIcon name="dashboard" focused={focused} />,
          href: canAccessModule(role, 'dashboard') ? '/(app)/dashboard' : null,
        }}
      />
      <Tabs.Screen
        name="orders/index"
        options={{
          title: 'Orders',
          tabBarIcon: ({ focused }) => <TabIcon name="orders" focused={focused} />,
          href: canAccessModule(role, 'orders') ? '/(app)/orders' : null,
        }}
      />
      <Tabs.Screen
        name="orders/new"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="orders/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="delivery/index"
        options={{
          title: 'Delivery',
          tabBarIcon: ({ focused }) => <TabIcon name="delivery" focused={focused} />,
          href: canAccessModule(role, 'delivery') ? '/(app)/delivery' : null,
        }}
      />
      <Tabs.Screen
        name="delivery/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="process/index"
        options={{
          title: 'Process',
          tabBarIcon: ({ focused }) => <TabIcon name="process" focused={focused} />,
          href: canAccessModule(role, 'process') ? '/(app)/process' : null,
        }}
      />
      <Tabs.Screen
        name="process/new"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="process/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="inventory/index"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ focused }) => <TabIcon name="inventory" focused={focused} />,
          href: canAccessModule(role, 'inventory') ? '/(app)/inventory' : null,
        }}
      />
      <Tabs.Screen
        name="inventory/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="sales/index"
        options={{
          title: 'Sales',
          tabBarIcon: ({ focused }) => <TabIcon name="sales" focused={focused} />,
          href: canAccessModule(role, 'sales') ? '/(app)/sales' : null,
        }}
      />
      <Tabs.Screen
        name="staff/index"
        options={{
          title: 'Staff',
          tabBarIcon: ({ focused }) => <TabIcon name="staff" focused={focused} />,
          href: canAccessModule(role, 'staff') ? '/(app)/staff' : null,
        }}
      />
      <Tabs.Screen
        name="staff/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="archive/index"
        options={{
          title: 'Archive',
          tabBarIcon: ({ focused }) => <TabIcon name="archive" focused={focused} />,
          href: canAccessModule(role, 'archive') ? '/(app)/archive' : null,
        }}
      />
    </Tabs>
  );
}
