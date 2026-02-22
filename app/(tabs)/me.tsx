import { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Modal, Pressable } from "react-native";
import { useCurrentUser, useSignOut } from "@coinbase/cdp-hooks";
import { useAction } from "convex/react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/convex/_generated/api";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as WebBrowser from "expo-web-browser";

const ONBOARDING_KEY = '@coin-expo/onboarding-completed';

function useUsdcBalance(address: string | null) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const getUsdcBalance = useAction(api.cdp.getUsdcBalance);

  const fetchBalance = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const result = await getUsdcBalance({ address });
      setBalance(result);
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [address, getUsdcBalance]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
}

function shortenAddress(address: string): string {
  if (address.length <= 13) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getInitials(address: string): string {
  return address.slice(2, 4).toUpperCase();
}

export default function MeScreen() {
  const { currentUser } = useCurrentUser();
  const { signOut } = useSignOut();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleStartOnboarding = async () => {
    setMenuVisible(false);
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    router.replace("/(onboarding)");
  };

  const walletAddress =
    currentUser?.evmSmartAccounts?.[0] ??
    currentUser?.evmAccounts?.[0] ??
    null;

  const { balance, loading: balanceLoading, refetch: refetchBalance } = useUsdcBalance(walletAddress);

  const createOnrampUrl = useAction(api.cdp.createOnrampUrl);
  const [addMoneyLoading, setAddMoneyLoading] = useState(false);

  const handleAddMoney = async () => {
    if (!walletAddress) {
      Alert.alert("Error", "No wallet address found.");
      return;
    }
    setAddMoneyLoading(true);
    try {
      const url = await createOnrampUrl({ address: walletAddress });
      await WebBrowser.openBrowserAsync(url);
      refetchBalance();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to open onramp."
      );
    } finally {
      setAddMoneyLoading(false);
    }
  };

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
    <ScrollView style={styles.container} bounces={false}>
      <View style={styles.blueHeader}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerLabel}>Personal</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)}>
            <MaterialIcons name="settings" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {walletAddress ? getInitials(walletAddress) : "?"}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {walletAddress && (
          <Text style={styles.addressLabel}>
            {shortenAddress(walletAddress)}
          </Text>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.balanceLabel}>Wallet</Text>
          </View>
          <View style={styles.addressRow}>
            <MaterialIcons name="account-balance-wallet" size={20} color="#008CFF" />
            <Text style={styles.fullAddress} selectable numberOfLines={1}>
              {walletAddress ?? "No wallet found"}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceDollar}>$</Text>
            <Text style={styles.balanceAmount}>
              {balanceLoading ? "—" : (balance?.split(".")[0] ?? "0")}
            </Text>
            <Text style={styles.balanceCents}>
              .{balanceLoading ? "——" : (balance?.split(".")[1] ?? "00")}
            </Text>
          </View>
          <View style={styles.balanceActions}>
            <TouchableOpacity style={styles.transferButton}>
              <Text style={styles.transferText}>Transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addMoneyButton, addMoneyLoading && styles.addMoneyButtonDisabled]}
              onPress={handleAddMoney}
              disabled={addMoneyLoading}
            >
              {addMoneyLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.addMoneyText}>Add money</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {currentUser?.userId && (
          <View style={styles.card}>
            <Text style={styles.balanceLabel}>User ID</Text>
            <Text style={styles.userId} selectable>
              {currentUser.userId}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <MaterialIcons name="logout" size={20} color="#ff3b30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuDropdown}>
            <TouchableOpacity style={styles.menuItem} onPress={handleStartOnboarding}>
              <MaterialIcons name="play-circle-outline" size={20} color="#11181C" />
              <Text style={styles.menuItemText}>Start Onboarding</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  blueHeader: {
    backgroundColor: "#008CFF",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  avatarContainer: {
    alignItems: "center",
    marginTop: -40,
    marginBottom: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4ECDC4",
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#11181C",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#687076",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fullAddress: {
    flex: 1,
    fontSize: 14,
    fontFamily: "monospace",
    color: "#11181C",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
    marginBottom: 16,
  },
  balanceDollar: {
    fontSize: 20,
    fontWeight: "400",
    color: "#11181C",
    marginTop: 4,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: "700",
    color: "#11181C",
    lineHeight: 52,
  },
  balanceCents: {
    fontSize: 20,
    fontWeight: "400",
    color: "#11181C",
    marginTop: 4,
  },
  balanceActions: {
    flexDirection: "row",
    gap: 12,
  },
  transferButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#008CFF",
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: "center",
  },
  transferText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#008CFF",
  },
  addMoneyButton: {
    flex: 1,
    backgroundColor: "#008CFF",
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: "center",
  },
  addMoneyButtonDisabled: {
    opacity: 0.6,
  },
  addMoneyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  userId: {
    fontSize: 14,
    color: "#11181C",
    marginTop: 8,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ff3b30",
  },
  signOutText: {
    color: "#ff3b30",
    fontSize: 16,
    fontWeight: "600",
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 100,
    paddingRight: 20,
  },
  menuDropdown: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 200,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: "#11181C",
    fontWeight: "500",
  },
});
