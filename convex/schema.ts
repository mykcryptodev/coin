import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  transactions: defineTable({
    from: v.string(),
    to: v.string(),
    amount: v.number(),
    note: v.string(),
    timestamp: v.number(),
    recipientEmail: v.optional(v.string()),
  }).index("by_timestamp", ["timestamp"]),
});
