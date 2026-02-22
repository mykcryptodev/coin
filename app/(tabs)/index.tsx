import { StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useCurrentUser, useSignOut } from "@coinbase/cdp-hooks";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function HomeScreen() {
  const { currentUser } = useCurrentUser();
  const { signOut } = useSignOut();

  const walletAddress =
    currentUser?.evmSmartAccounts?.[0] ??
    currentUser?.evmAccounts?.[0] ??
    null;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to sign out."
      );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.heading}>
        Wallet
      </ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Your Address</ThemedText>
        <ThemedText style={styles.address} selectable>
          {walletAddress ?? "No wallet found"}
        </ThemedText>
      </ThemedView>

      {currentUser?.userId && (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">User ID</ThemedText>
          <ThemedText style={styles.detail} selectable>
            {currentUser.userId}
          </ThemedText>
        </ThemedView>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
      </TouchableOpacity>
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
    marginBottom: 24,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  address: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: "monospace",
  },
  detail: {
    marginTop: 8,
    fontSize: 14,
  },
  signOutButton: {
    marginTop: 32,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ff3b30",
    alignItems: "center",
  },
  signOutText: {
    color: "#ff3b30",
    fontSize: 16,
    fontWeight: "600",
  },
});
