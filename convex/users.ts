import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

function normalizeUsername(input: string): string {
  return input.startsWith("@") ? input.slice(1).toLowerCase() : input.toLowerCase();
}

export const getByWalletAddress = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_walletAddress", (q) => q.eq("walletAddress", args.walletAddress))
      .first();
  },
});

export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const normalized = normalizeUsername(args.username);
    return await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", normalized))
      .first();
  },
});

export const checkUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const normalized = normalizeUsername(args.username);

    if (normalized.length < 3 || normalized.length > 20) {
      return { available: false, error: "Username must be 3-20 characters" };
    }

    if (!USERNAME_REGEX.test(normalized)) {
      return { available: false, error: "Only letters, numbers, and underscores allowed" };
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", normalized))
      .first();

    if (existing) {
      return { available: false, error: "Username already taken" };
    }

    return { available: true };
  },
});

export const setUsername = mutation({
  args: {
    cdpUserId: v.string(),
    username: v.string(),
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const normalized = normalizeUsername(args.username);

    if (normalized.length < 3 || normalized.length > 20) {
      throw new ConvexError("Username must be 3-20 characters");
    }

    if (!USERNAME_REGEX.test(normalized)) {
      throw new ConvexError("Only letters, numbers, and underscores allowed");
    }

    const existingWithUsername = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", normalized))
      .first();

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_cdpUserId", (q) => q.eq("cdpUserId", args.cdpUserId))
      .first();

    if (existingWithUsername && existingWithUsername._id !== existingUser?._id) {
      throw new ConvexError("Username already taken");
    }

    if (existingUser) {
      await ctx.db.patch(existingUser._id, { username: normalized });
    } else {
      await ctx.db.insert("users", {
        cdpUserId: args.cdpUserId,
        username: normalized,
        walletAddress: args.walletAddress,
      });
    }

    return normalized;
  },
});
