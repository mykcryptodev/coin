import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    cdpUserId: v.string(),
    username: v.string(),
    walletAddress: v.string(),
  })
    .index("by_username", ["username"])
    .index("by_walletAddress", ["walletAddress"])
    .index("by_cdpUserId", ["cdpUserId"]),
  transactions: defineTable({
    from: v.string(),
    to: v.string(),
    amount: v.number(),
    note: v.string(),
    timestamp: v.number(),
    recipientEmail: v.optional(v.string()),
    recipientUsername: v.optional(v.string()),
  }).index("by_timestamp", ["timestamp"]),
  reactions: defineTable({
    transactionId: v.id("transactions"),
    userId: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_transaction_and_user", ["transactionId", "userId"]),
  comments: defineTable({
    transactionId: v.id("transactions"),
    userId: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_transactionId", ["transactionId"]),
});
