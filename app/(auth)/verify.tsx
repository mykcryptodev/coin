import { useCallback, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useVerifyEmailOTP } from '@coinbase/cdp-hooks';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  VerificationCode,
  type VerificationCodeRef,
  type StatusType,
} from '@/components/verification-code';
import { useThemeColor } from '@/hooks/use-theme-color';

const SUCCESS_DELAY_MS = 500;
const ERROR_RESET_DELAY_MS = 1000;

export default function VerifyScreen() {
  const { flowId, email } = useLocalSearchParams<{
    flowId: string;
    email: string;
  }>();
  const [code, setCode] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const verificationStatus = useSharedValue<StatusType>('inProgress');
  const { verifyEmailOTP } = useVerifyEmailOTP();
  const router = useRouter();
  const codeRef = useRef<VerificationCodeRef>(null);
  const tintColor = useThemeColor({}, 'tint');

  const { height } = useReanimatedKeyboardAnimation();
  const rKeyboardStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateY: -(height.value / 2) }],
    }),
    [],
  );

  useFocusEffect(
    useCallback(() => {
      codeRef.current?.focus();
      return () => {};
    }, []),
  );

  const handleCodeComplete = useCallback(
    async (codeString: string) => {
      if (loading) return;
      setLoading(true);

      try {
        await verifyEmailOTP({ flowId, otp: codeString });
        verificationStatus.value = 'correct';
        setTimeout(async () => {
          const hasCompletedOnboarding = await AsyncStorage.getItem(
            "@coin-expo/onboarding-completed"
          );
          if (hasCompletedOnboarding === "true") {
            router.replace("/(tabs)");
          } else {
            router.replace("/(onboarding)");
          }
        }, SUCCESS_DELAY_MS);
      } catch {
        verificationStatus.value = 'wrong';
        codeRef.current?.shake();
        setTimeout(() => {
          verificationStatus.value = 'inProgress';
          setCode([]);
          codeRef.current?.clear();
          codeRef.current?.focus();
          setLoading(false);
        }, ERROR_RESET_DELAY_MS);
        return;
      }

      setLoading(false);
    },
    [flowId, loading, router, verificationStatus, verifyEmailOTP],
  );

  const handlePaste = useCallback(async () => {
    if (loading) return;
    const text = await Clipboard.getStringAsync();
    const digits = text.replace(/\D/g, '').slice(0, 6);
    if (digits.length === 0) return;

    const newCode = digits.split('').map(Number);
    setCode(newCode);

    if (newCode.length === 6) {
      handleCodeComplete(digits);
    }
  }, [loading, handleCodeComplete]);

  return (
    <ThemedView style={styles.container}>
      <Animated.View style={rKeyboardStyle}>
        <ThemedText type="title" style={styles.heading}>
          Check your email
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Enter the 6-digit code sent to {email}.
        </ThemedText>

        <VerificationCode
          ref={codeRef}
          code={code}
          maxLength={6}
          status={verificationStatus}
          onCodeChange={setCode}
          onCodeComplete={handleCodeComplete}
          editable={!loading}
        />

        <TouchableOpacity
          style={styles.pasteButton}
          onPress={handlePaste}
          disabled={loading}
        >
          <ThemedText style={[styles.pasteText, { color: tintColor, opacity: loading ? 0.4 : 1 }]}>
            Paste from clipboard
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  heading: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 32,
    opacity: 0.7,
  },
  pasteButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  pasteText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
