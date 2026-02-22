import { StyleSheet, View, Text, TouchableOpacity } from "react-native";

type CommentItemProps = {
  text: string;
  userId: string;
  createdAt: number;
  isOwn: boolean;
  onDelete: () => void;
};

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

function shortenAddress(str: string): string {
  if (str.length <= 10) return str;
  return `${str.slice(0, 6)}...${str.slice(-4)}`;
}

export function CommentItem({
  text,
  userId,
  createdAt,
  isOwn,
  onDelete,
}: CommentItemProps) {
  return (
    <TouchableOpacity
      style={[styles.commentItem, isOwn && styles.commentItemOwn]}
      onLongPress={isOwn ? onDelete : undefined}
      activeOpacity={isOwn ? 0.7 : 1}
    >
      <View style={styles.commentHeader}>
        <Text style={styles.userId}>{shortenAddress(userId)}</Text>
        <Text style={styles.timestamp}>{timeAgo(createdAt)}</Text>
      </View>
      <Text style={styles.commentText}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  commentItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e8e8e8",
  },
  commentItemOwn: {
    backgroundColor: "#f8f9fa",
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  userId: {
    fontSize: 13,
    color: "#687076",
  },
  timestamp: {
    fontSize: 13,
    color: "#687076",
  },
  commentText: {
    fontSize: 14,
    color: "#11181C",
  },
});
