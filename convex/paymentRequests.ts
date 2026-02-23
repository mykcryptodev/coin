import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";

type CreateArgs = {
  from: string;
  to: string;
  amount: number;
  note: string;
  recipientEmail?: string;
  recipientUsername?: string;
  requesterUsername?: string;
};

type PayArgs = {
  requestId: string;
  payerAddress: string;
};

type DeclineArgs = {
  requestId: string;
  declinerAddress: string;
};

type CancelArgs = {
  requestId: string;
  cancellerAddress: string;
};

type GetIncomingArgs = {
  recipientAddress: string;
};

type GetOutgoingArgs = {
  requesterAddress: string;
};

type Ctx = { db: any };

export async function createHandler(ctx: Ctx, args: CreateArgs): Promise<string> {
  throw new ConvexError("Not implemented");
}

export async function payHandler(ctx: Ctx, args: PayArgs): Promise<void> {
  throw new ConvexError("Not implemented");
}

export async function declineHandler(ctx: Ctx, args: DeclineArgs): Promise<void> {
  throw new ConvexError("Not implemented");
}

export async function cancelHandler(ctx: Ctx, args: CancelArgs): Promise<void> {
  throw new ConvexError("Not implemented");
}

export async function getIncomingHandler(ctx: Ctx, args: GetIncomingArgs): Promise<any[]> {
  throw new ConvexError("Not implemented");
}

export async function getOutgoingHandler(ctx: Ctx, args: GetOutgoingArgs): Promise<any[]> {
  throw new ConvexError("Not implemented");
}

export const create = mutation({
  args: {
    from: v.string(),
    to: v.string(),
    amount: v.number(),
    note: v.string(),
    recipientEmail: v.optional(v.string()),
    recipientUsername: v.optional(v.string()),
    requesterUsername: v.optional(v.string()),
  },
  handler: createHandler,
});

export const pay = mutation({
  args: {
    requestId: v.id("paymentRequests"),
    payerAddress: v.string(),
  },
  handler: payHandler,
});

export const decline = mutation({
  args: {
    requestId: v.id("paymentRequests"),
    declinerAddress: v.string(),
  },
  handler: declineHandler,
});

export const cancel = mutation({
  args: {
    requestId: v.id("paymentRequests"),
    cancellerAddress: v.string(),
  },
  handler: cancelHandler,
});

export const getIncoming = query({
  args: {
    recipientAddress: v.string(),
  },
  handler: getIncomingHandler,
});

export const getOutgoing = query({
  args: {
    requesterAddress: v.string(),
  },
  handler: getOutgoingHandler,
});
