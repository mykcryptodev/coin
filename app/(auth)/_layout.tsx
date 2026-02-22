import { Redirect, Stack } from "expo-router";
import { useIsSignedIn } from "@coinbase/cdp-hooks";

export default function AuthLayout() {
  const { isSignedIn } = useIsSignedIn();

  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack>
      <Stack.Screen name="sign-in" options={{ title: "Sign In" }} />
      <Stack.Screen name="verify" options={{ title: "Verify Email" }} />
    </Stack>
  );
}
