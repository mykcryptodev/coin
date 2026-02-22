import { StyleSheet, View, FlatList, TextInput, Text } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

function getInitials(address: string): string {
  return address.slice(2, 4).toUpperCase();
}

function getAvatarColor(address: string): string {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
  ];
  const index =
    address.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;
  return colors[index];
}

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

type Transaction = {
  _id: string;
  from: string;
  to: string;
  amount: number;
  note: string;
  timestamp: number;
  recipientEmail?: string;
};

function TransactionItem({ item }: { item: Transaction }) {
  return (
    <View style={styles.feedItem}>
      <View
        style={[styles.avatar, { backgroundColor: getAvatarColor(item.from) }]}
      >
        <View style={styles.avatarTextContainer}>
          <MaterialIcons name="person" size={20} color="#fff" />
        </View>
      </View>
      <View style={styles.feedContent}>
        <View style={styles.feedHeader}>
          <View style={styles.feedNames}>
            <MaterialIcons
              name="arrow-upward"
              size={14}
              color="#008CFF"
              style={{ marginRight: 2 }}
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                <Text style={styles.feedName}>
                  {shortenAddress(item.from)}
                </Text>
                <Text style={styles.feedAction}> paid </Text>
                <Text style={styles.feedName}>
                  {item.recipientEmail ?? shortenAddress(item.to)}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.feedTime}>{timeAgo(item.timestamp)}</Text>
        </View>
        <Text style={styles.feedAmount}>${item.amount.toFixed(2)} USDC</Text>
        {item.note ? <Text style={styles.feedNote}>{item.note}</Text> : null}
        <View style={styles.feedActions}>
          <MaterialIcons name="favorite-border" size={18} color="#687076" />
          <MaterialIcons
            name="chat-bubble-outline"
            size={18}
            color="#687076"
            style={{ marginLeft: 16 }}
          />
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const transactions = useQuery(api.transactions.get);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons
          name="search"
          size={20}
          color="#999"
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search people..."
          placeholderTextColor="#999"
        />
      </View>

      <FlatList
        data={transactions ?? []}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <TransactionItem item={item} />}
        contentContainerStyle={styles.feedList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="receipt-long" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>
              Send USDC to see activity here
            </Text>
          </View>
        }
      />
    </View>
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
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#11181C",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#11181C",
  },
  feedList: {
    paddingBottom: 100,
  },
  feedItem: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e8e8e8",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  avatarTextContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  feedContent: {
    flex: 1,
  },
  feedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  feedNames: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  feedName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#11181C",
  },
  feedAction: {
    fontSize: 15,
    color: "#687076",
  },
  feedTime: {
    fontSize: 13,
    color: "#999",
  },
  feedAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#008CFF",
    marginTop: 2,
  },
  feedNote: {
    fontSize: 15,
    color: "#11181C",
    marginTop: 4,
  },
  feedActions: {
    flexDirection: "row",
    marginTop: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#11181C",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
});
