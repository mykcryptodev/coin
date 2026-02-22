import { Redirect, Tabs } from 'expo-router';
import React, { useCallback } from 'react';
import { useIsSignedIn } from '@coinbase/cdp-hooks';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { BottomTabBar } from '@/components/bottom-bar-skia';

export default function TabLayout() {
  const { isSignedIn } = useIsSignedIn();

  const tabBar = useCallback(
    (props: BottomTabBarProps) => <BottomTabBar {...props} />,
    [],
  );

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={tabBar}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="pay"
        options={{
          title: 'Pay/Request',
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
        }}
      />
    </Tabs>
  );
}
