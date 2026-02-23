import { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Modal, Pressable } from "react-native";
import { useCurrentUser, useSignOut } from "@coinbase/cdp-hooks";
import { useAction, useQuery, useMutation } from "convex/react";
import { useSendUsdc } from "@coinbase/cdp-hooks";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/convex/_generated/api";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as WebBrowser from "expo-web-browser";

const ONBOARDING_KEY = '@coin-expo/onboarding-completed';

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function shortenAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

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

  const convexUser = useQuery(
    api.users.getByWalletAddress,
    walletAddress ? { walletAddress } : "skip",
  );

  const { balance, loading: balanceLoading, refetch: refetchBalance } = useUsdcBalance(walletAddress);

  const incomingRequests = useQuery(
    api.paymentRequests.getIncoming,
    walletAddress ? { recipientAddress: walletAddress } : "skip"
  );
  const outgoingRequests = useQuery(
    api.paymentRequests.getOutgoing,
    walletAddress ? { requesterAddress: walletAddress } : "skip"
  );

  const payRequestMutation = useMutation(api.paymentRequests.pay);
  const declineRequestMutation = useMutation(api.paymentRequests.decline);
  const cancelRequestMutation = useMutation(api.paymentRequests.cancel);

  const { sendUsdc } = useSendUsdc();

  const [requestStates, setRequestStates] = useState<Record<string, "idle" | "loading" | "success" | "error">>({});

  const handlePayRequest = async (request: { _id: string; from: string; amount: number }) => {
    if (!walletAddress) return;
    setRequestStates((prev) => ({ ...prev, [request._id]: "loading" }));
    try {
      await sendUsdc({
        to: request.from as `0x${string}`,
        amount: request.amount.toString(),
        network: "base" as const,
        useCdpPaymaster: true,
      });
      await payRequestMutation({ requestId: request._id as any, payerAddress: walletAddress });
      setRequestStates((prev) => ({ ...prev, [request._id]: "success" }));
    } catch (error) {
      Alert.alert("Payment Failed", error instanceof Error ? error.message : "Unknown error");
      setRequestStates((prev) => ({ ...prev, [request._id]: "error" }));
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!walletAddress) return;
    setRequestStates((prev) => ({ ...prev, [requestId]: "loading" }));
    try {
      await declineRequestMutation({ requestId: requestId as any, declinerAddress: walletAddress });
      setRequestStates((prev) => ({ ...prev, [requestId]: "idle" }));
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Unknown error");
      setRequestStates((prev) => ({ ...prev, [requestId]: "error" }));
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!walletAddress) return;
    setRequestStates((prev) => ({ ...prev, [requestId]: "loading" }));
    try {
      await cancelRequestMutation({ requestId: requestId as any, cancellerAddress: walletAddress });
      setRequestStates((prev) => ({ ...prev, [requestId]: "idle" }));
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Unknown error");
      setRequestStates((prev) => ({ ...prev, [requestId]: "error" }));
    }
  };

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
            {convexUser?.username?.[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {convexUser?.username && (
          <Text style={styles.usernameLabel}>
            @{convexUser.username}
          </Text>
        )}

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

        {incomingRequests && incomingRequests.length > 0 && (
          <View style={styles.requestCard}>
            <View style={styles.requestSectionHeaderRow}>
              <Text style={styles.requestSectionHeader}>Requests for You</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{incomingRequests.length}</Text>
              </View>
            </View>
            {incomingRequests.map((request, index) => (
              <View
                key={request._id}
                style={[
                  styles.requestItem,
                  index === incomingRequests.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={styles.requestItemHeader}>
                  <Text style={styles.requestFrom}>
                    {request.requesterUsername
                      ? `@${request.requesterUsername}`
                      : shortenAddress(request.from)}
                  </Text>
                  <Text style={styles.requestAmount}>${request.amount.toFixed(2)}</Text>
                </View>
                {request.note ? (
                  <Text style={styles.requestNote}>{request.note}</Text>
                ) : null}
                <Text style={styles.requestTime}>{timeAgo(request.createdAt)}</Text>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.payButton, requestStates[request._id] === "loading" && { opacity: 0.6 }]}
                    onPress={() => handlePayRequest(request)}
                    disabled={requestStates[request._id] === "loading"}
                  >
                    {requestStates[request._id] === "loading" ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.payButtonText}>Pay</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.declineButton, requestStates[request._id] === "loading" && { opacity: 0.6 }]}
                    onPress={() => handleDeclineRequest(request._id)}
                    disabled={requestStates[request._id] === "loading"}
                  >
                    {requestStates[request._id] === "loading" ? (
                      <ActivityIndicator color="#FF3B30" size="small" />
                    ) : (
                      <Text style={styles.declineButtonText}>Decline</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {outgoingRequests && outgoingRequests.length > 0 && (
          <View style={styles.requestCard}>
            <Text style={styles.requestSectionHeader}>Your Requests</Text>
            {outgoingRequests.map((request, index) => {
              const statusColors: Record<string, string> = {
                pending: "#FFA500",
                paid: "#34C759",
                declined: "#FF3B30",
                cancelled: "#687076",
              };
              return (
                <View
                  key={request._id}
                  style={[
                    styles.requestItem,
                    index === outgoingRequests.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.requestItemHeader}>
                    <Text style={styles.requestFrom}>
                      {request.recipientUsername
                        ? `@${request.recipientUsername}`
                        : request.recipientEmail ?? shortenAddress(request.to)}
                    </Text>
                    <Text style={styles.requestAmount}>${request.amount.toFixed(2)}</Text>
                  </View>
                  {request.note ? (
                    <Text style={styles.requestNote}>{request.note}</Text>
                  ) : null}
                  <View style={styles.requestStatusRow}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors[request.status] }]}>
                      <Text style={styles.statusText}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Text>
                    </View>
                    <Text style={styles.requestTime}>{timeAgo(request.createdAt)}</Text>
                  </View>
                  {request.status === "pending" && (
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={[styles.cancelButton, requestStates[request._id] === "loading" && { opacity: 0.6 }]}
                        onPress={() => handleCancelRequest(request._id)}
                        disabled={requestStates[request._id] === "loading"}
                      >
                        {requestStates[request._id] === "loading" ? (
                          <ActivityIndicator color="#687076" size="small" />
                        ) : (
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

      </View>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuDropdown}>
            <TouchableOpacity style={styles.menuItem} onPress={handleStartOnboarding}>
              <MaterialIcons name="play-circle-outline" size={20} color="#11181C" />
              <Text style={styles.menuItemText}>Start Onboarding</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); handleSignOut(); }}>
              <MaterialIcons name="logout" size={20} color="#ff3b30" />
              <Text style={styles.menuItemTextDestructive}>Sign Out</Text>
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
  usernameLabel: {
    fontSize: 18,
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
  balanceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#687076",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  menuItemTextDestructive: {
    fontSize: 16,
    color: "#ff3b30",
    fontWeight: "500",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#e8e8e8",
    marginHorizontal: 16,
  },
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  requestSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  requestSectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#11181C",
    marginBottom: 12,
  },
  requestItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e8e8e8",
  },
  requestItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  requestFrom: {
    fontSize: 15,
    fontWeight: "600",
    color: "#11181C",
  },
  requestAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#11181C",
  },
  requestNote: {
    fontSize: 14,
    color: "#687076",
    marginTop: 4,
  },
  requestTime: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
  },
  requestStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  payButton: {
    flex: 1,
    backgroundColor: "#008CFF",
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  declineButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#FF3B30",
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF3B30",
  },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: "#687076",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#687076",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  countBadge: {
    backgroundColor: "#008CFF",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
});
