import { useState, useMemo, memo } from "react";
import { StyleSheet, View, FlatList, TextInput, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useCurrentUser } from "@coinbase/cdp-hooks";
import { Image } from "expo-image";
import { HeartButton } from "@/components/HeartButton";
import { CommentSection } from "@/components/CommentSection";

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
  _id: Id<"transactions">;
  from: string;
  to: string;
  amount: number;
  note: string;
  timestamp: number;
  recipientEmail?: string;
  recipientUsername?: string;
};

type AvatarData = { avatarUrl: string | null; username: string | null } | null;

const TransactionItem = memo(function TransactionItem({
  item,
  senderData,
  isLiked,
  onToggleLike,
  currentUserId,
  commentCount,
}: {
  item: Transaction;
  senderData: AvatarData;
  isLiked: boolean;
  onToggleLike: () => void;
  currentUserId: string | undefined;
  commentCount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const senderDisplay = senderData?.username
    ? `@${senderData.username}`
    : shortenAddress(item.from);

  return (
    <View style={styles.feedItem}>
      <View
        style={[styles.avatar, { backgroundColor: getAvatarColor(item.from) }]}
      >
        {senderData?.avatarUrl ? (
          <Image
            source={{ uri: senderData.avatarUrl }}
            style={styles.avatarImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.avatarTextContainer}>
            <MaterialIcons name="person" size={20} color="#fff" />
          </View>
        )}
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
                <Text style={styles.feedName}>{senderDisplay}</Text>
                <Text style={styles.feedAction}> paid </Text>
                <Text style={styles.feedName}>
                   {item.recipientUsername
                     ? `@${item.recipientUsername}`
                     : item.recipientEmail ?? shortenAddress(item.to)}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.feedTime}>{timeAgo(item.timestamp)}</Text>
        </View>
        <Text style={styles.feedAmount}>${item.amount.toFixed(2)} USDC</Text>
        {item.note ? <Text style={styles.feedNote}>{item.note}</Text> : null}
        <View style={styles.feedActions}>
          <HeartButton isLiked={isLiked} onToggle={onToggleLike} size={18} />
          <TouchableOpacity
            style={styles.commentButton}
            onPress={() => setExpanded((prev) => !prev)}
          >
            <MaterialIcons
              name={expanded ? "chat-bubble" : "chat-bubble-outline"}
              size={18}
              color={expanded ? "#008CFF" : "#687076"}
            />
            {commentCount > 0 && (
              <Text style={[styles.commentCount, expanded && styles.commentCountActive]}>
                {commentCount}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        {expanded && (
          <CommentSection
            transactionId={item._id}
            currentUserId={currentUserId}
          />
        )}
      </View>
    </View>
  );
});

export default function HomeScreen() {
  const transactions = useQuery(api.transactions.get);
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const toggleLike = useMutation(api.reactions.toggleLike);
  const userReactions = useQuery(
    api.reactions.getUserReactions,
    currentUser?.userId ? { userId: currentUser.userId } : "skip"
  );
  const likedIds = new Set(userReactions?.map((r) => r.transactionId) ?? []);
  const commentCounts = useQuery(api.comments.counts) ?? {};

  const uniqueSenderAddresses = useMemo(() => {
    if (!transactions?.length) return [];
    return [...new Set(transactions.map((t) => t.from))];
  }, [transactions]);

  const userAvatars = useQuery(
    api.users.getUserAvatars,
    uniqueSenderAddresses.length > 0
      ? { addresses: uniqueSenderAddresses }
      : "skip"
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
        <TouchableOpacity onPress={() => router.push("/qr")}>
          <MaterialIcons name="qr-code-scanner" size={26} color="#11181C" />
        </TouchableOpacity>
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
        extraData={currentUser?.userId}
        renderItem={({ item }) => (
          <TransactionItem
            item={item}
            senderData={userAvatars?.[item.from] ?? null}
            isLiked={likedIds.has(item._id)}
            onToggleLike={() => {
              if (currentUser?.userId) {
                toggleLike({ transactionId: item._id, userId: currentUser.userId });
              }
            }}
            currentUserId={currentUser?.userId}
            commentCount={commentCounts[item._id] ?? 0}
          />
        )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    alignItems: "center",
    marginTop: 8,
    overflow: "visible",
  },
  commentButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
  },
  commentCount: {
    fontSize: 13,
    color: "#687076",
    marginLeft: 4,
  },
  commentCountActive: {
    color: "#008CFF",
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
