import { ConvexError } from "convex/values";
import {
  createHandler,
  payHandler,
  declineHandler,
  cancelHandler,
  getIncomingHandler,
  getOutgoingHandler,
} from "../paymentRequests";

// Mock database factory
function createMockDb() {
  const store = new Map<string, any>();
  let nextId = 1;
  let lastEqConstraints: Record<string, any> = {};
  let lastTable = "";
  let lastOrder: "asc" | "desc" = "asc";

  const db = {
    _store: store,
    insert: jest.fn(async (table: string, doc: any) => {
      const id = `mock_id_${nextId++}`;
      store.set(id, { _id: id, _table: table, ...doc });
      return id;
    }),
    get: jest.fn(async (id: string) => store.get(id) ?? null),
    patch: jest.fn(async (id: string, fields: any) => {
      const existing = store.get(id);
      if (existing) store.set(id, { ...existing, ...fields });
    }),
    query: jest.fn((table: string) => {
      lastTable = table;
      lastEqConstraints = {};
      lastOrder = "asc";

      const indexChain = {
        withIndex: jest.fn((_indexName: string, constraintFn?: (q: any) => any) => {
          if (constraintFn) {
            const eqCollector = {
              eq: (field: string, value: any) => {
                lastEqConstraints[field] = value;
                return eqCollector;
              },
            };
            constraintFn(eqCollector);
          }
          return orderChain;
        }),
      };

      const orderChain = {
        order: jest.fn((dir: "asc" | "desc") => {
          lastOrder = dir;
          return collectChain;
        }),
        collect: jest.fn(async () => filterAndSort()),
        first: jest.fn(async () => {
          const r = filterAndSort();
          return r[0] ?? null;
        }),
      };

      const collectChain = {
        collect: jest.fn(async () => filterAndSort()),
        first: jest.fn(async () => {
          const r = filterAndSort();
          return r[0] ?? null;
        }),
      };

      function filterAndSort() {
        let results = [...store.values()].filter((doc) => doc._table === lastTable);
        for (const [field, value] of Object.entries(lastEqConstraints)) {
          results = results.filter((doc) => doc[field] === value);
        }
        results.sort((a, b) => {
          const aVal = a.createdAt ?? 0;
          const bVal = b.createdAt ?? 0;
          return lastOrder === "desc" ? bVal - aVal : aVal - bVal;
        });
        return results;
      }

      return indexChain;
    }),
  };
  return db;
}

function createMockCtx(db: ReturnType<typeof createMockDb>) {
  return { db } as any;
}

describe("paymentRequests", () => {
  describe("create", () => {
    it("creates a pending payment request with valid inputs", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);

      await createHandler(ctx, {
        from: "0xAAA",
        to: "0xBBB",
        amount: 100,
        note: "Lunch money",
      });

      expect(mockDb.insert).toHaveBeenCalledWith(
        "paymentRequests",
        expect.objectContaining({
          from: "0xAAA",
          to: "0xBBB",
          amount: 100,
          note: "Lunch money",
          status: "pending",
        })
      );
    });

    it("rejects request with amount <= 0", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);

      await expect(
        createHandler(ctx, {
          from: "0xAAA",
          to: "0xBBB",
          amount: 0,
          note: "Invalid",
        })
      ).rejects.toThrow("Amount must be greater than 0");

      await expect(
        createHandler(ctx, {
          from: "0xAAA",
          to: "0xBBB",
          amount: -50,
          note: "Negative",
        })
      ).rejects.toThrow("Amount must be greater than 0");
    });

    it("rejects request where from === to (self-request)", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);

      await expect(
        createHandler(ctx, {
          from: "0xAAA",
          to: "0xAAA",
          amount: 100,
          note: "Self request",
        })
      ).rejects.toThrow("Cannot request payment from yourself");
    });

    it("rejects request with note longer than 280 characters", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);
      const longNote = "x".repeat(281);

      await expect(
        createHandler(ctx, {
          from: "0xAAA",
          to: "0xBBB",
          amount: 100,
          note: longNote,
        })
      ).rejects.toThrow("Note must be 280 characters or less");
    });

    it("stores recipientUsername and requesterUsername when available", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);

      await createHandler(ctx, {
        from: "0xAAA",
        to: "0xBBB",
        amount: 50,
        note: "With usernames",
        recipientUsername: "bob",
        requesterUsername: "alice",
      });

      expect(mockDb.insert).toHaveBeenCalledWith(
        "paymentRequests",
        expect.objectContaining({
          recipientUsername: "bob",
          requesterUsername: "alice",
        })
      );
    });

    it("sets status to 'pending' and timestamps on creation", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);

      await createHandler(ctx, {
        from: "0xAAA",
        to: "0xBBB",
        amount: 75,
        note: "Test timestamps",
      });

      expect(mockDb.insert).toHaveBeenCalledWith(
        "paymentRequests",
        expect.objectContaining({
          status: "pending",
          createdAt: expect.any(Number),
          updatedAt: expect.any(Number),
        })
      );
    });
  });

  describe("pay", () => {
    it("marks request as 'paid' when recipient pays", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);

      const reqData = {
        _id: "req_1",
        _table: "paymentRequests",
        from: "0xAAA",
        to: "0xBBB",
        amount: 50,
        note: "Dinner",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockDb._store.set("req_1", reqData);
      mockDb.get.mockResolvedValueOnce(reqData);

      await payHandler(ctx, {
        requestId: "req_1" as any,
        payerAddress: "0xBBB",
      });

      expect(mockDb.patch).toHaveBeenCalledWith(
        "req_1",
        expect.objectContaining({
          status: "paid",
        })
      );
    });

    it("creates a transaction record when request is paid", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);

      const reqData = {
        _id: "req_2",
        _table: "paymentRequests",
        from: "0xAAA",
        to: "0xBBB",
        amount: 100,
        note: "Groceries",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockDb._store.set("req_2", reqData);
      mockDb.get.mockResolvedValueOnce(reqData);

      await payHandler(ctx, {
        requestId: "req_2" as any,
        payerAddress: "0xBBB",
      });

      // Transaction should be from payer (request.to) to requester (request.from)
      expect(mockDb.insert).toHaveBeenCalledWith(
        "transactions",
        expect.objectContaining({
          from: "0xBBB",
          to: "0xAAA",
          amount: 100,
        })
      );
    });

    it("rejects paying a non-pending request", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);

      const reqData = {
        _id: "req_3",
        _table: "paymentRequests",
        from: "0xAAA",
        to: "0xBBB",
        amount: 50,
        note: "Already declined",
        status: "declined",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockDb._store.set("req_3", reqData);
      mockDb.get.mockResolvedValueOnce(reqData);

      await expect(
        payHandler(ctx, {
          requestId: "req_3" as any,
          payerAddress: "0xBBB",
        })
      ).rejects.toThrow("Request is not pending");
    });

    it("rejects paying by someone other than the recipient", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);

      const reqData = {
        _id: "req_4",
        _table: "paymentRequests",
        from: "0xAAA",
        to: "0xBBB",
        amount: 50,
        note: "Wrong payer",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockDb._store.set("req_4", reqData);
      mockDb.get.mockResolvedValueOnce(reqData);

      await expect(
        payHandler(ctx, {
          requestId: "req_4" as any,
          payerAddress: "0xCCC",
        })
      ).rejects.toThrow("Only the recipient can pay this request");
    });
  });

  describe("decline", () => {
    it("marks request as 'declined' when recipient declines", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);

      const reqData = {
        _id: "req_5",
        _table: "paymentRequests",
        from: "0xAAA",
        to: "0xBBB",
        amount: 50,
        note: "To decline",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockDb._store.set("req_5", reqData);
      mockDb.get.mockResolvedValueOnce(reqData);

      await declineHandler(ctx, {
        requestId: "req_5" as any,
        declinerAddress: "0xBBB",
      });

      expect(mockDb.patch).toHaveBeenCalledWith(
        "req_5",
        expect.objectContaining({
          status: "declined",
        })
      );
    });

    it("rejects declining a non-pending request", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);

      const reqData = {
        _id: "req_6",
        _table: "paymentRequests",
        from: "0xAAA",
        to: "0xBBB",
        amount: 50,
        note: "Already paid",
        status: "paid",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockDb._store.set("req_6", reqData);
      mockDb.get.mockResolvedValueOnce(reqData);

      await expect(
        declineHandler(ctx, {
          requestId: "req_6" as any,
          declinerAddress: "0xBBB",
        })
      ).rejects.toThrow("Request is not pending");
    });

    it("rejects declining by someone other than the recipient", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);

      const reqData = {
        _id: "req_7",
        _table: "paymentRequests",
        from: "0xAAA",
        to: "0xBBB",
        amount: 50,
        note: "Wrong decliner",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockDb._store.set("req_7", reqData);
      mockDb.get.mockResolvedValueOnce(reqData);

      await expect(
        declineHandler(ctx, {
          requestId: "req_7" as any,
          declinerAddress: "0xCCC",
        })
      ).rejects.toThrow("Only the recipient can decline this request");
    });
  });

  describe("cancel", () => {
    it("marks request as 'cancelled' when requester cancels", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);

      const reqData = {
        _id: "req_8",
        _table: "paymentRequests",
        from: "0xAAA",
        to: "0xBBB",
        amount: 50,
        note: "To cancel",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockDb._store.set("req_8", reqData);
      mockDb.get.mockResolvedValueOnce(reqData);

      await cancelHandler(ctx, {
        requestId: "req_8" as any,
        cancellerAddress: "0xAAA", // The requester
      });

      expect(mockDb.patch).toHaveBeenCalledWith(
        "req_8",
        expect.objectContaining({
          status: "cancelled",
        })
      );
    });

    it("rejects cancelling a non-pending request", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);

      const reqData = {
        _id: "req_9",
        _table: "paymentRequests",
        from: "0xAAA",
        to: "0xBBB",
        amount: 50,
        note: "Already declined",
        status: "declined",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockDb._store.set("req_9", reqData);
      mockDb.get.mockResolvedValueOnce(reqData);

      await expect(
        cancelHandler(ctx, {
          requestId: "req_9" as any,
          cancellerAddress: "0xAAA",
        })
      ).rejects.toThrow("Request is not pending");
    });

    it("rejects cancelling by someone other than the requester", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);

      const reqData = {
        _id: "req_10",
        _table: "paymentRequests",
        from: "0xAAA",
        to: "0xBBB",
        amount: 50,
        note: "Wrong canceller",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockDb._store.set("req_10", reqData);
      mockDb.get.mockResolvedValueOnce(reqData);

      await expect(
        cancelHandler(ctx, {
          requestId: "req_10" as any,
          cancellerAddress: "0xBBB",
        })
      ).rejects.toThrow("Only the requester can cancel this request");
    });
  });

  describe("queries", () => {
    it("getIncoming returns pending requests for a given recipient address", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);

      // Seed requests
      mockDb._store.set("req_a", {
        _id: "req_a",
        _table: "paymentRequests",
        from: "0x111",
        to: "0xBBB",
        amount: 10,
        note: "A",
        status: "pending",
        createdAt: 1000,
        updatedAt: 1000,
      });
      mockDb._store.set("req_b", {
        _id: "req_b",
        _table: "paymentRequests",
        from: "0x222",
        to: "0xBBB",
        amount: 20,
        note: "B",
        status: "pending",
        createdAt: 2000,
        updatedAt: 2000,
      });
      mockDb._store.set("req_c", {
        _id: "req_c",
        _table: "paymentRequests",
        from: "0x333",
        to: "0xCCC",
        amount: 30,
        note: "C",
        status: "pending",
        createdAt: 3000,
        updatedAt: 3000,
      });
      mockDb._store.set("req_d", {
        _id: "req_d",
        _table: "paymentRequests",
        from: "0x444",
        to: "0xBBB",
        amount: 40,
        note: "D",
        status: "paid",
        createdAt: 4000,
        updatedAt: 4000,
      });

      const result = await getIncomingHandler(ctx, {
        recipientAddress: "0xBBB",
      });

      // Should return only pending requests for 0xBBB, ordered desc by createdAt
      expect(result).toHaveLength(2);
      expect(result[0]._id).toBe("req_b"); // Most recent first
      expect(result[1]._id).toBe("req_a");
    });

    it("getOutgoing returns all requests for a given requester address", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);

      // Seed requests
      mockDb._store.set("req_e", {
        _id: "req_e",
        _table: "paymentRequests",
        from: "0xAAA",
        to: "0x111",
        amount: 10,
        note: "E",
        status: "pending",
        createdAt: 1000,
        updatedAt: 1000,
      });
      mockDb._store.set("req_f", {
        _id: "req_f",
        _table: "paymentRequests",
        from: "0xAAA",
        to: "0x222",
        amount: 20,
        note: "F",
        status: "declined",
        createdAt: 2000,
        updatedAt: 2000,
      });
      mockDb._store.set("req_g", {
        _id: "req_g",
        _table: "paymentRequests",
        from: "0xBBB",
        to: "0x333",
        amount: 30,
        note: "G",
        status: "pending",
        createdAt: 3000,
        updatedAt: 3000,
      });

      const result = await getOutgoingHandler(ctx, {
        requesterAddress: "0xAAA",
      });

      // Should return all requests from 0xAAA regardless of status, ordered desc
      expect(result).toHaveLength(2);
      expect(result[0]._id).toBe("req_f"); // Most recent first
      expect(result[1]._id).toBe("req_e");
    });

    it("getIncoming does not return paid/declined/cancelled requests", async () => {
      const mockDb = createMockDb();
      const ctx = createMockCtx(mockDb);

      // Seed only non-pending requests
      mockDb._store.set("req_h", {
        _id: "req_h",
        _table: "paymentRequests",
        from: "0x111",
        to: "0xBBB",
        amount: 10,
        note: "H",
        status: "paid",
        createdAt: 1000,
        updatedAt: 1000,
      });
      mockDb._store.set("req_i", {
        _id: "req_i",
        _table: "paymentRequests",
        from: "0x222",
        to: "0xBBB",
        amount: 20,
        note: "I",
        status: "declined",
        createdAt: 2000,
        updatedAt: 2000,
      });
      mockDb._store.set("req_j", {
        _id: "req_j",
        _table: "paymentRequests",
        from: "0x333",
        to: "0xBBB",
        amount: 30,
        note: "J",
        status: "cancelled",
        createdAt: 3000,
        updatedAt: 3000,
      });

      const result = await getIncomingHandler(ctx, {
        recipientAddress: "0xBBB",
      });

      // Should return empty since no pending requests
      expect(result).toHaveLength(0);
    });
  });
});
