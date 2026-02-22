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
    const user = await ctx.db
      .query("users")
      .withIndex("by_walletAddress", (q) => q.eq("walletAddress", args.walletAddress))
      .first();
    if (!user) return null;
    const avatarUrl = user.avatarStorageId
      ? await ctx.storage.getUrl(user.avatarStorageId)
      : null;
    return { ...user, avatarUrl };
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

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateAvatar = mutation({
  args: {
    cdpUserId: v.string(),
    walletAddress: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_cdpUserId", (q) => q.eq("cdpUserId", args.cdpUserId))
      .first();

    if (existingUser) {
      if (existingUser.avatarStorageId) {
        await ctx.storage.delete(existingUser.avatarStorageId);
      }
      await ctx.db.patch(existingUser._id, {
        avatarStorageId: args.storageId,
      });
    } else {
      await ctx.db.insert("users", {
        cdpUserId: args.cdpUserId,
        username: "",
        walletAddress: args.walletAddress,
        avatarStorageId: args.storageId,
      });
    }
  },
});

export const getUserAvatars = query({
  args: { addresses: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results: Record<
      string,
      { avatarUrl: string | null; username: string | null } | null
    > = {};

    await Promise.all(
      args.addresses.map(async (address) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_walletAddress", (q) =>
            q.eq("walletAddress", address)
          )
          .first();

        if (!user) {
          results[address] = null;
          return;
        }

        const avatarUrl = user.avatarStorageId
          ? await ctx.storage.getUrl(user.avatarStorageId)
          : null;

        results[address] = {
          avatarUrl,
          username: user.username || null,
        };
      })
    );

    return results;
  },
});
