import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    transactionId: v.id("transactions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comments")
      .withIndex("by_transactionId", (q) =>
        q.eq("transactionId", args.transactionId)
      )
      .collect();
  },
});

export const counts = query({
  args: {},
  handler: async (ctx) => {
    const allComments = await ctx.db.query("comments").collect();
    const countsMap: Record<string, number> = {};
    for (const comment of allComments) {
      countsMap[comment.transactionId] = (countsMap[comment.transactionId] ?? 0) + 1;
    }
    return countsMap;
  },
});

export const create = mutation({
  args: {
    transactionId: v.id("transactions"),
    userId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.text.trim();
    if (trimmed.length === 0) {
      throw new Error("Comment text cannot be empty");
    }
    if (trimmed.length > 500) {
      throw new Error("Comment text cannot exceed 500 characters");
    }

    await ctx.db.insert("comments", {
      transactionId: args.transactionId,
      userId: args.userId,
      text: trimmed,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    commentId: v.id("comments"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      return;
    }
    if (comment.userId !== args.userId) {
      throw new Error("Not authorized to delete this comment");
    }

    await ctx.db.delete(args.commentId);
  },
});
