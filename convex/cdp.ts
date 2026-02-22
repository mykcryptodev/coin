"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { CdpClient } from "@coinbase/cdp-sdk";

export const resolveRecipient = action({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<string> => {
    const cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      walletSecret: process.env.CDP_WALLET_SECRET,
    });

    try {
      const endUser = await cdp.endUser.createEndUser({
        authenticationMethods: [{ type: "email", email: args.email }],
        evmAccount: { createSmartAccount: true },
      });

      const smartAccount = endUser.evmSmartAccounts?.[0];
      if (!smartAccount) {
        throw new Error("No smart account returned from CDP API.");
      }
      return smartAccount;
    } catch (e: any) {
      // If user already exists, look them up
      if (e?.response?.status === 409 || String(e?.message).includes("409")) {
        const result = await cdp.endUser.listEndUsers();
        const users = result.endUsers ?? [];
        const match = users.find((u: any) =>
          u.authenticationMethods?.some(
            (m: any) => m.type === "email" && m.email === args.email
          )
        );
        if (match?.evmSmartAccounts?.[0]) {
          return match.evmSmartAccounts[0];
        }
        throw new Error("User exists but could not resolve their wallet address.");
      }
      throw e;
    }
  },
});
