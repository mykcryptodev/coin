import { useEffect, useState } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, Stack } from "expo-router";
import { useIsSignedIn } from "@coinbase/cdp-hooks";

export default function AuthLayout() {
  const { isSignedIn } = useIsSignedIn();
  const [onboardingCompleted, setOnboardingCompleted] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    if (isSignedIn) {
      AsyncStorage.getItem("@coin-expo/onboarding-completed").then((value) => {
        setOnboardingCompleted(value === "true");
      });
    }
  }, [isSignedIn]);

  if (isSignedIn) {
    if (onboardingCompleted === null) {
      return null;
    }
    if (onboardingCompleted) {
      return <Redirect href="/(tabs)" />;
    }
    return <Redirect href="/(onboarding)" />;
  }

  return (
    <Stack>
      <Stack.Screen name="sign-in" options={{ title: "Sign In" }} />
      <Stack.Screen name="verify" options={{ title: "Verify Email" }} />
    </Stack>
  );
}
