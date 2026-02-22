import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    from: v.string(),
    to: v.string(),
    amount: v.number(),
    note: v.string(),
    recipientEmail: v.optional(v.string()),
    recipientUsername: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("transactions", {
      ...args,
      timestamp: Date.now(),
    });
  },
});
