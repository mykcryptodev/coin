import { useState } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSendUsdc, useCurrentUser } from "@coinbase/cdp-hooks";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function PayScreen() {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const { currentUser } = useCurrentUser();
  const { sendUsdc, status } = useSendUsdc();
  const createTransaction = useMutation(api.transactions.create);

  const senderAddress =
    currentUser?.evmSmartAccounts?.[0] ??
    currentUser?.evmAccounts?.[0] ??
    null;

  const loading = status === "pending";

  const displayAmount = amount || "0";

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

      await createTransaction({
        from: senderAddress ?? "unknown",
        to: to.trim(),
        amount: Number(amount.trim()),
        note: note.trim() || "USDC payment",
      });

      Alert.alert("Success", `Sent $${amount} USDC`);
      setTo("");
      setAmount("");
      setNote("");
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "Failed to send USDC."
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pay/Request</Text>
      </View>

      <View style={styles.recipientSection}>
        <View style={styles.recipientRow}>
          <MaterialIcons name="person" size={20} color="#008CFF" />
          <TextInput
            style={styles.recipientInput}
            placeholder="Enter 0x address..."
            placeholderTextColor="#999"
            value={to}
            onChangeText={setTo}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>
      </View>

      <View style={styles.amountSection}>
        <Text style={styles.dollarSign}>$</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0"
          placeholderTextColor="#ccc"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          editable={!loading}
        />
      </View>

      <View style={styles.noteSection}>
        <TextInput
          style={styles.noteInput}
          placeholder="What's it for?"
          placeholderTextColor="#999"
          value={note}
          onChangeText={setNote}
          editable={!loading}
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.requestButton, loading && styles.buttonDisabled]}
          disabled={loading}
        >
          <Text style={styles.requestButtonText}>Request</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.payButton, loading && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={loading}
        >
          <Text style={styles.payButtonText}>
            {loading ? "Sending..." : "Pay"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#11181C",
  },
  recipientSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e8e8e8",
  },
  recipientRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  recipientInput: {
    flex: 1,
    fontSize: 16,
    color: "#11181C",
    marginLeft: 8,
  },
  amountSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  dollarSign: {
    fontSize: 48,
    fontWeight: "300",
    color: "#11181C",
  },
  amountInput: {
    fontSize: 48,
    fontWeight: "700",
    color: "#11181C",
    minWidth: 40,
    textAlign: "center",
  },
  noteSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: "#11181C",
  },
  buttonRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  requestButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
  },
  requestButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#008CFF",
  },
  payButton: {
    flex: 1,
    backgroundColor: "#008CFF",
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
