import { useState, useEffect } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  View,
  Text,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSendUsdc, useCurrentUser } from "@coinbase/cdp-hooks";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { NumberInput } from "@/components/family-numpad";

function isEmail(input: string): boolean {
  return input.includes("@") && !input.startsWith("0x");
}

export default function PayScreen() {
  const { address } = useLocalSearchParams<{ address?: string }>();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [resolving, setResolving] = useState(false);
  const { currentUser } = useCurrentUser();
  const { sendUsdc, status } = useSendUsdc();
  const router = useRouter();

  useEffect(() => {
    if (address) setTo(address);
  }, [address]);
  const createTransaction = useMutation(api.transactions.create);
  const resolveRecipient = useAction(api.cdp.resolveRecipient);

  const senderAddress =
    currentUser?.evmSmartAccounts?.[0] ??
    currentUser?.evmAccounts?.[0] ??
    null;

  const loading = status === "pending" || resolving;

  const handleSend = async () => {
    const recipient = to.trim();
    if (!recipient) {
      Alert.alert("Error", "Please enter a recipient email or address.");
      return;
    }
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    try {
      let resolvedAddress: string;
      let recipientEmail: string | undefined;

      if (isEmail(recipient)) {
        recipientEmail = recipient;
        setResolving(true);
        try {
          resolvedAddress = await resolveRecipient({ email: recipient });
        } finally {
          setResolving(false);
        }
      } else {
        resolvedAddress = recipient;
      }

      await sendUsdc({
        to: resolvedAddress as `0x${string}`,
        amount: amount.trim(),
        network: "base" as const,
        useCdpPaymaster: true,
      });

      await createTransaction({
        from: senderAddress ?? "unknown",
        to: resolvedAddress,
        amount: Number(amount.trim()),
        note: note.trim() || "USDC payment",
        ...(recipientEmail ? { recipientEmail } : {}),
      });

      Alert.alert(
        "Success",
        recipientEmail
          ? `Sent $${amount} USDC to ${recipientEmail}`
          : `Sent $${amount} USDC`
      );
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pay/Request</Text>
        <TouchableOpacity onPress={() => router.push("/qr")}>
          <MaterialIcons name="qr-code-scanner" size={26} color="#11181C" />
        </TouchableOpacity>
      </View>

      <View style={styles.recipientSection}>
        <View style={styles.recipientRow}>
          <MaterialIcons name="person" size={20} color="#008CFF" />
          <TextInput
            style={styles.recipientInput}
            placeholder="Email or 0x address..."
            placeholderTextColor="#999"
            value={to}
            onChangeText={setTo}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          {resolving && (
            <ActivityIndicator size="small" color="#008CFF" />
          )}
        </View>
      </View>

      <View style={styles.amountSection}>
        <View style={styles.dollarRow}>
          <Text style={styles.dollarSign}>$</Text>
        </View>
        <NumberInput
          value={amount}
          onValueChange={setAmount}
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
            {resolving ? "Resolving..." : status === "pending" ? "Sending..." : "Pay"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  },
  dollarRow: {
    alignItems: "center",
    paddingTop: 12,
  },
  dollarSign: {
    fontSize: 48,
    fontWeight: "300",
    color: "#11181C",
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
