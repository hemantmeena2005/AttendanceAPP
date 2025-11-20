import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Hides the top header
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: { 
          height: 65, 
          paddingBottom: 10, 
          paddingTop: 10,
          backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#ffffff',
          borderTopColor: colorScheme === 'dark' ? '#334155' : '#e2e8f0',
        },
      }}
    >
      {/* 1. Home / Scanner Tab */}
      <Tabs.Screen
        name="index" // Matches file: app/(tabs)/index.tsx
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size }) => <Ionicons name="scan-circle" size={size} color={color} />,
        }}
      />

      {/* 2. History Tab */}
      <Tabs.Screen
        name="history" // Matches file: app/(tabs)/history.tsx
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />

      {/* 3. Settings Tab */}
      <Tabs.Screen
        name="settings" // Matches file: app/(tabs)/settings.tsx
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}