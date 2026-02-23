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
  if (args.amount <= 0) {
    throw new ConvexError("Amount must be greater than 0");
  }
  if (args.from === args.to) {
    throw new ConvexError("Cannot request payment from yourself");
  }
  if (args.note.length > 280) {
    throw new ConvexError("Note must be 280 characters or less");
  }

  const now = Date.now();
  const id = await ctx.db.insert("paymentRequests", {
    from: args.from,
    to: args.to,
    amount: args.amount,
    note: args.note,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    ...(args.recipientEmail ? { recipientEmail: args.recipientEmail } : {}),
    ...(args.recipientUsername ? { recipientUsername: args.recipientUsername } : {}),
    ...(args.requesterUsername ? { requesterUsername: args.requesterUsername } : {}),
  });

  return id;
}

export async function payHandler(ctx: Ctx, args: PayArgs): Promise<void> {
  const request = await ctx.db.get(args.requestId);
  if (!request) {
    throw new ConvexError("Request not found");
  }
  if (request.status !== "pending") {
    throw new ConvexError("Request is not pending");
  }
  if (args.payerAddress !== request.to) {
    throw new ConvexError("Only the recipient can pay this request");
  }

  await ctx.db.patch(args.requestId, {
    status: "paid",
    updatedAt: Date.now(),
  });

  await ctx.db.insert("transactions", {
    from: request.to,
    to: request.from,
    amount: request.amount,
    note: request.note,
    timestamp: Date.now(),
    ...(request.requesterUsername ? { recipientUsername: request.requesterUsername } : {}),
  });
}

export async function declineHandler(ctx: Ctx, args: DeclineArgs): Promise<void> {
  const request = await ctx.db.get(args.requestId);
  if (!request) {
    throw new ConvexError("Request not found");
  }
  if (request.status !== "pending") {
    throw new ConvexError("Request is not pending");
  }
  if (args.declinerAddress !== request.to) {
    throw new ConvexError("Only the recipient can decline this request");
  }

  await ctx.db.patch(args.requestId, {
    status: "declined",
    updatedAt: Date.now(),
  });
}

export async function cancelHandler(ctx: Ctx, args: CancelArgs): Promise<void> {
  const request = await ctx.db.get(args.requestId);
  if (!request) {
    throw new ConvexError("Request not found");
  }
  if (request.status !== "pending") {
    throw new ConvexError("Request is not pending");
  }
  if (args.cancellerAddress !== request.from) {
    throw new ConvexError("Only the requester can cancel this request");
  }

  await ctx.db.patch(args.requestId, {
    status: "cancelled",
    updatedAt: Date.now(),
  });
}

export async function getIncomingHandler(ctx: Ctx, args: GetIncomingArgs): Promise<any[]> {
  return await ctx.db
    .query("paymentRequests")
    .withIndex("by_recipient_status_createdAt", (q: any) =>
      q.eq("to", args.recipientAddress).eq("status", "pending")
    )
    .order("desc")
    .collect();
}

export async function getOutgoingHandler(ctx: Ctx, args: GetOutgoingArgs): Promise<any[]> {
  return await ctx.db
    .query("paymentRequests")
    .withIndex("by_requester_createdAt", (q: any) =>
      q.eq("from", args.requesterAddress)
    )
    .order("desc")
    .collect();
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
