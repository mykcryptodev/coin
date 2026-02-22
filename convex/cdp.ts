"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { CdpClient } from "@coinbase/cdp-sdk";
import { getAuthHeaders } from "@coinbase/cdp-sdk/auth";

function getCdpClient() {
  return new CdpClient({
    apiKeyId: process.env.CDP_API_KEY_ID,
    apiKeySecret: process.env.CDP_API_KEY_SECRET,
    walletSecret: process.env.CDP_WALLET_SECRET,
  });
}

export const getUsdcBalance = action({
  args: { address: v.string() },
  handler: async (ctx, args): Promise<string> => {
    const cdp = getCdpClient();
    let pageToken: string | undefined;
    do {
      const result = await cdp.evm.listTokenBalances({
        address: args.address as `0x${string}`,
        network: "base",
        ...(pageToken ? { pageToken } : {}),
      });
      const usdc = result.balances.find(
        (b) => b.token.contractAddress?.toLowerCase() === "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
      );
      if (usdc) {
        const raw = BigInt(usdc.amount.amount);
        const decimals = usdc.amount.decimals;
        const divisor = 10n ** BigInt(decimals);
        const whole = raw / divisor;
        const frac = (raw % divisor).toString().padStart(decimals, "0").slice(0, 2);
        return `${whole}.${frac}`;
      }
      pageToken = result.nextPageToken;
    } while (pageToken);
    return "0.00";
  },
});

export const createOnrampUrl = action({
  args: { address: v.string() },
  handler: async (ctx, args): Promise<string> => {
    const apiKeyId = process.env.CDP_API_KEY_ID!;
    const apiKeySecret = process.env.CDP_API_KEY_SECRET!;

    const requestMethod = "POST";
    const requestHost = "api.cdp.coinbase.com";
    const requestPath = "/platform/v2/onramp/sessions";
    const body = {
      destinationAddress: args.address,
      purchaseCurrency: "USDC",
      destinationNetwork: "base",
    };

    const headers = await getAuthHeaders({
      apiKeyId,
      apiKeySecret,
      requestMethod,
      requestHost,
      requestPath,
      requestBody: body,
    });

    const resp = await fetch(`https://${requestHost}${requestPath}`, {
      method: requestMethod,
      headers,
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Onramp session failed (${resp.status}): ${text}`);
    }

    const data = await resp.json();
    const url = data.session?.onrampUrl;
    if (!url) {
      throw new Error("No onrampUrl returned from API");
    }
    return url;
  },
});

export const resolveRecipient = action({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<string> => {
    const cdp = getCdpClient();

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
      const msg = String(e?.message ?? "");
      if (e?.response?.status === 409 || msg.includes("409") || msg.includes("already associated")) {
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
