import { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Modal, Pressable, TextInput } from "react-native";
import { useCurrentUser, useSignOut } from "@coinbase/cdp-hooks";
import { useAction, useMutation, useQuery } from "convex/react";
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

  const userProfile = useQuery(api.users.getByWalletAddress, walletAddress ? { walletAddress } : "skip");

  const { balance, loading: balanceLoading, refetch: refetchBalance } = useUsdcBalance(walletAddress);

  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [debouncedUsername, setDebouncedUsername] = useState("");

  const setUsername = useMutation(api.users.setUsername);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(usernameInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [usernameInput]);

  const usernameAvailability = useQuery(
    api.users.checkUsernameAvailable,
    debouncedUsername.length >= 3 ? { username: debouncedUsername } : "skip"
  );

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
          <View style={styles.cardHeader}>
            <Text style={styles.balanceLabel}>Username</Text>
          </View>

          {!editingUsername ? (
            <>
              {userProfile?.username ? (
                <View style={styles.usernameRow}>
                  <Text style={styles.usernameText}>@{userProfile.username}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setUsernameInput(userProfile.username || "");
                      setEditingUsername(true);
                    }}
                  >
                    <MaterialIcons name="edit" size={20} color="#008CFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.usernameRow}>
                  <Text style={{ fontSize: 16, color: "#687076" }}>Set your @username</Text>
                  <TouchableOpacity
                    style={styles.setUsernameButton}
                    onPress={() => {
                      setUsernameInput("");
                      setEditingUsername(true);
                    }}
                  >
                    <Text style={styles.setUsernameText}>Set</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.usernameInputRow}>
                <Text style={styles.usernamePrefix}>@</Text>
                <TextInput
                  style={styles.usernameTextInput}
                  placeholder="username"
                  placeholderTextColor="#ccc"
                  value={usernameInput}
                  onChangeText={setUsernameInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {usernameInput.length >= 3 && debouncedUsername !== usernameInput && (
                <View style={{ marginTop: 6, marginLeft: 4 }}>
                  <ActivityIndicator size="small" color="#008CFF" />
                </View>
              )}

              {usernameInput.length >= 3 && debouncedUsername === usernameInput && (
                <Text
                  style={[
                    styles.availabilityText,
                    { color: usernameAvailability?.available ? "#34C759" : "#ff3b30" },
                  ]}
                >
                  {usernameAvailability?.available
                    ? "✓ Available"
                    : usernameAvailability?.error || "Not available"}
                </Text>
              )}

              <View style={styles.usernameActions}>
                <TouchableOpacity
                  style={[styles.transferButton, { flex: 1 }]}
                  onPress={() => {
                    setEditingUsername(false);
                    setUsernameInput("");
                  }}
                >
                  <Text style={styles.transferText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.addMoneyButton,
                    { flex: 1 },
                    (usernameSaving ||
                      usernameInput.length < 3 ||
                      usernameAvailability?.available === false) &&
                      styles.addMoneyButtonDisabled,
                  ]}
                  onPress={async () => {
                    if (!currentUser?.userId || !walletAddress) return;
                    setUsernameSaving(true);
                    try {
                      await setUsername({
                        cdpUserId: currentUser.userId,
                        username: usernameInput,
                        walletAddress: walletAddress,
                      });
                      setEditingUsername(false);
                      setUsernameInput("");
                    } catch (e) {
                      Alert.alert(
                        "Error",
                        e instanceof Error ? e.message : "Failed to set username."
                      );
                    } finally {
                      setUsernameSaving(false);
                    }
                  }}
                  disabled={
                    usernameSaving ||
                    usernameInput.length < 3 ||
                    usernameAvailability?.available === false
                  }
                >
                  {usernameSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.addMoneyText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
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
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  usernameText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#008CFF",
  },
  usernameInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  usernamePrefix: {
    fontSize: 18,
    fontWeight: "600",
    color: "#687076",
    marginRight: 2,
  },
  usernameTextInput: {
    flex: 1,
    fontSize: 18,
    color: "#11181C",
  },
  availabilityText: {
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
  },
  usernameActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  setUsernameButton: {
    borderWidth: 1.5,
    borderColor: "#008CFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  setUsernameText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#008CFF",
  },
});
