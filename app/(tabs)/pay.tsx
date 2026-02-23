import { useState, useEffect, useRef } from "react";
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
import { useMutation, useAction, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { NumberInput } from "@/components/family-numpad";
import { LoadingButton } from "@/components/loading-button";

function isEmail(input: string): boolean {
  return input.includes("@") && !input.startsWith("0x");
}

function isUsername(input: string): boolean {
  return /^@[a-z0-9_]+$/i.test(input);
}

type ResolvedRecipient = {
  resolvedAddress: string;
  recipientEmail?: string;
  recipientUsername?: string;
};

export default function PayScreen() {
  const { address } = useLocalSearchParams<{ address?: string }>();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [resolving, setResolving] = useState(false);
  const [sendState, setSendState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [requestState, setRequestState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const { currentUser } = useCurrentUser();
  const { sendUsdc } = useSendUsdc();
  const router = useRouter();
  const convex = useConvex();

  useEffect(() => {
    if (address) setTo(address);
  }, [address]);
  const createTransaction = useMutation(api.transactions.create);
  const createRequest = useMutation(api.paymentRequests.create);
  const resolveRecipient = useAction(api.cdp.resolveRecipient);

  const senderAddress =
    currentUser?.evmSmartAccounts?.[0] ??
    currentUser?.evmAccounts?.[0] ??
    null;

  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      if (requestResetTimeoutRef.current) clearTimeout(requestResetTimeoutRef.current);
    };
  }, []);

  const resolveRecipientAddress = async (recipient: string): Promise<ResolvedRecipient> => {
    let resolvedAddress: string;
    let recipientEmail: string | undefined;
    let recipientUsername: string | undefined;

    if (isUsername(recipient)) {
      const usernameToLookup = recipient.slice(1).toLowerCase();
      setResolving(true);
      try {
        const user = await convex.query(api.users.getByUsername, { username: usernameToLookup });
        if (!user) {
          throw new Error("Username not found");
        }
        resolvedAddress = user.walletAddress;
        recipientUsername = usernameToLookup;
      } finally {
        setResolving(false);
      }
    } else if (isEmail(recipient)) {
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

    return { resolvedAddress, recipientEmail, recipientUsername };
  };

  const buttonTitle = sendState === "loading" ? "Sending..." : sendState === "success" ? "Sent!" : sendState === "error" ? "Failed" : "Pay";
  const loading = sendState === "loading" || requestState === "loading";

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

    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    setSendState("loading");

    try {
      const { resolvedAddress, recipientEmail, recipientUsername } = await resolveRecipientAddress(recipient);

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
        ...(recipientUsername ? { recipientUsername } : {}),
      });

      setSendState("success");
      resetTimeoutRef.current = setTimeout(() => {
        setTo("");
        setAmount("");
        setNote("");
        setSendState("idle");
      }, 5000);
    } catch (e) {
      setSendState("error");
      resetTimeoutRef.current = setTimeout(() => {
        setSendState("idle");
      }, 5000);
    }
  };

  const handleRequest = async () => {
    if (!senderAddress) {
      Alert.alert("Error", "No wallet address found. Please sign in again.");
      return;
    }

    const recipient = to.trim();
    if (!recipient) {
      Alert.alert("Error", "Please enter a recipient email or address.");
      return;
    }
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    if (requestResetTimeoutRef.current) clearTimeout(requestResetTimeoutRef.current);
    setRequestState("loading");

    try {
      const { resolvedAddress, recipientEmail, recipientUsername } = await resolveRecipientAddress(recipient);

      if (senderAddress === resolvedAddress) {
        Alert.alert("Error", "You cannot request money from yourself.");
        setRequestState("idle");
        return;
      }

      const requesterUser = await convex.query(api.users.getByWalletAddress, { walletAddress: senderAddress });

      await createRequest({
        from: senderAddress,
        to: resolvedAddress,
        amount: Number(amount.trim()),
        note: note.trim() || "Payment request",
        ...(recipientEmail ? { recipientEmail } : {}),
        ...(recipientUsername ? { recipientUsername } : {}),
        ...(requesterUser?.username ? { requesterUsername: requesterUser.username } : {}),
      });

      setRequestState("success");
      requestResetTimeoutRef.current = setTimeout(() => {
        setTo("");
        setAmount("");
        setNote("");
        setRequestState("idle");
      }, 5000);
    } catch (e) {
      setRequestState("error");
      requestResetTimeoutRef.current = setTimeout(() => {
        setRequestState("idle");
      }, 5000);
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
            placeholder="@username, email, or 0x address..."
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
        <NumberInput
          value={amount}
          onValueChange={setAmount}
          prefix="$"
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
        <LoadingButton
          status={requestState}
          onPress={requestState === "idle" && !loading ? handleRequest : undefined}
          style={styles.requestButton}
          colorFromStatusMap={{
            idle: "#008CFF",
            loading: "#008CFF",
            success: "#34C759",
            error: "#FF3B30",
          }}
          titleFromStatusMap={{
            idle: "Request",
            loading: "Requesting...",
            success: "Requested!",
            error: "Failed",
          }}
        />
        <LoadingButton
          status={sendState}
          onPress={sendState === "idle" && !loading ? handleSend : undefined}
          style={styles.payButton}
          colorFromStatusMap={{
            idle: "#008CFF",
            loading: "#008CFF",
            success: "#34C759",
            error: "#FF3B30",
          }}
          titleFromStatusMap={{
            idle: buttonTitle,
            loading: buttonTitle,
            success: buttonTitle,
            error: buttonTitle,
          }}
        />
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
    paddingVertical: 16,
    borderRadius: 24,
    overflow: "hidden",
  },
  payButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 24,
    overflow: "hidden",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
