import { useState } from "react";
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Animated, { FadeIn } from "react-native-reanimated";
import { CommentItem } from "@/components/CommentItem";

type CommentSectionProps = {
  transactionId: Id<"transactions">;
  currentUserId: string | undefined;
};

export function CommentSection({ transactionId, currentUserId }: CommentSectionProps) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const comments = useQuery(api.comments.list, { transactionId });
  const createComment = useMutation(api.comments.create);
  const removeComment = useMutation(api.comments.remove);

  const handleSubmit = async () => {
    if (!currentUserId || text.trim().length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createComment({
        transactionId,
        userId: currentUserId,
        text: text.trim(),
      });
      setText("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (commentId: Id<"comments">) => {
    if (!currentUserId) return;
    removeComment({ commentId, userId: currentUserId });
  };

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      {comments === undefined ? (
        <Text style={styles.loadingText}>Loading comments...</Text>
      ) : comments.length === 0 ? (
        <Text style={styles.emptyText}>No comments yet</Text>
      ) : (
        comments.map((comment) => (
          <CommentItem
            key={comment._id}
            text={comment.text}
            userId={comment.userId}
            createdAt={comment.createdAt}
            isOwn={comment.userId === currentUserId}
            onDelete={() => handleDelete(comment._id)}
          />
        ))
      )}

      {currentUserId ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor="#999"
            value={text}
            onChangeText={setText}
            maxLength={500}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (isSubmitting || text.trim().length === 0) && styles.sendButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || text.trim().length === 0}
          >
            <MaterialIcons
              name="send"
              size={18}
              color={isSubmitting || text.trim().length === 0 ? "#ccc" : "#008CFF"}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.signInText}>Sign in to comment</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e8e8e8",
    backgroundColor: "#fafafa",
    borderRadius: 8,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: 'Segment-Medium',
    color: "#999",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Segment-Medium',
    color: "#999",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e8e8e8",
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Segment-Medium',
    color: "#11181C",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 80,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e8e8e8",
  },
  sendButton: {
    marginLeft: 8,
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  signInText: {
    fontSize: 13,
    fontFamily: 'Segment-Medium',
    color: "#999",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontStyle: "italic",
  },
});
