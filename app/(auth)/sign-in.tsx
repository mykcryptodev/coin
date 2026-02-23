import { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSignInWithEmail } from "@coinbase/cdp-hooks";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { signInWithEmail } = useSignInWithEmail();
  const router = useRouter();

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithEmail({ email: email.trim() });
      router.push({
        pathname: "/(auth)/verify",
        params: { flowId: result.flowId, email: email.trim() },
      });
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to send code."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.heading}>
        Welcome
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        Sign in with your email to get started.
      </ThemedText>

      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSendCode}
        disabled={loading}
      >
        <ThemedText style={styles.buttonText}>
          {loading ? "Sending..." : "Send Code"}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  heading: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 32,
    opacity: 0.7,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    color: "#000",
    backgroundColor: "#fff",
    fontFamily: "Segment-Medium",
  },
  button: {
    backgroundColor: "#0052FF",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Segment-Bold",
  },
});
