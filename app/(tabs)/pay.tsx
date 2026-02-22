import { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { useSendUsdc, useCurrentUser } from "@coinbase/cdp-hooks";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function PayScreen() {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const { currentUser } = useCurrentUser();
  const { sendUsdc, status, data, error } = useSendUsdc();

  const senderAddress =
    currentUser?.evmSmartAccounts?.[0] ??
    currentUser?.evmAccounts?.[0] ??
    null;

  const loading = status === "pending";

  const handleSend = async () => {
    if (!to.trim()) {
      Alert.alert("Error", "Please enter a recipient address.");
      return;
    }
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    try {
      await sendUsdc({
        to: to.trim() as `0x${string}`,
        amount: amount.trim(),
        network: "base" as const,
        useCdpPaymaster: true,
      });
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "Failed to send USDC."
      );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.heading}>
        Send USDC
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        Send USDC on Base to any EVM address.
      </ThemedText>

      {senderAddress && (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">From</ThemedText>
          <ThemedText style={styles.address} selectable numberOfLines={1}>
            {senderAddress}
          </ThemedText>
        </ThemedView>
      )}

      <TextInput
        style={styles.input}
        placeholder="0x..."
        placeholderTextColor="#999"
        value={to}
        onChangeText={setTo}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="0.00"
        placeholderTextColor="#999"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSend}
        disabled={loading}
      >
        <ThemedText style={styles.buttonText}>
          {loading ? "Sending..." : "Send USDC"}
        </ThemedText>
      </TouchableOpacity>

      {status === "success" && data && (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Success</ThemedText>
          <ThemedText style={styles.address} selectable>
            {data.type === "evm-smart"
              ? data.userOpHash
              : data.type === "evm-eoa"
                ? data.transactionHash
                : data.transactionSignature}
          </ThemedText>
        </ThemedView>
      )}

      {status === "error" && error && (
        <ThemedView style={[styles.card, styles.errorCard]}>
          <ThemedText type="subtitle">Error</ThemedText>
          <ThemedText style={styles.errorText}>
            {error.message ?? "Something went wrong."}
          </ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
  },
  heading: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  errorCard: {
    borderColor: "#ff3b30",
  },
  address: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: "monospace",
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: "#ff3b30",
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
  },
  button: {
    backgroundColor: "#0052FF",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
