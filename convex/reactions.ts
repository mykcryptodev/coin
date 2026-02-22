import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const toggleLike = mutation({
  args: {
    transactionId: v.id("transactions"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_transaction_and_user", (q) =>
        q.eq("transactionId", args.transactionId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { liked: false };
    }

    await ctx.db.insert("reactions", {
      transactionId: args.transactionId,
      userId: args.userId,
    });
    return { liked: true };
  },
});

export const getUserReactions = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});
