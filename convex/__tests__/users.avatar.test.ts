jest.mock("../_generated/server", () => ({
  query: (config: { args: any; handler: any }) => config,
  mutation: (config: { args: any; handler: any }) => config,
}));

jest.mock("convex/values", () => ({
  v: {
    string: () => "string",
    number: () => "number",
    optional: (inner: any) => ({ optional: inner }),
    id: (table: string) => ({ id: table }),
    array: (inner: any) => ({ array: inner }),
  },
  ConvexError: class ConvexError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ConvexError";
    }
  },
}));

type MockUser = {
  _id: string;
  _creationTime: number;
  cdpUserId: string;
  username: string;
  walletAddress: string;
  avatarStorageId?: string;
};

function createMockDb(users: MockUser[] = []) {
  const store = [...users];

  const queryBuilder = (_table: string) => {
    let indexField: string | null = null;
    let indexValue: string | null = null;

    const chain = {
      withIndex(_name: string, fn: (q: any) => any) {
        const eqTracker = {
          eq(field: string, value: string) {
            indexField = field;
            indexValue = value;
            return eqTracker;
          },
        };
        fn(eqTracker);
        return chain;
      },
      first() {
        if (indexField && indexValue) {
          return (
            store.find(
              (u) => (u as Record<string, unknown>)[indexField!] === indexValue
            ) ?? null
          );
        }
        return store[0] ?? null;
      },
      collect() {
        return [...store];
      },
    };
    return chain;
  };

  return {
    query: queryBuilder,
    get: (id: string) => store.find((u) => u._id === id) ?? null,
    insert: jest.fn((_table: string, doc: Omit<MockUser, "_id" | "_creationTime">) => {
      const newDoc = { ...doc, _id: `id_${store.length}`, _creationTime: Date.now() } as MockUser;
      store.push(newDoc);
      return newDoc._id;
    }),
    patch: jest.fn((id: string, fields: Partial<MockUser>) => {
      const idx = store.findIndex((u) => u._id === id);
      if (idx !== -1) {
        store[idx] = { ...store[idx], ...fields };
      }
    }),
  };
}

function createMockStorage(urls: Record<string, string> = {}) {
  return {
    generateUploadUrl: jest.fn(() => "https://upload.convex.cloud/mock-upload-url"),
    getUrl: jest.fn((storageId: string) => urls[storageId] ?? null),
    delete: jest.fn(),
  };
}

const usersModule = require("../users");

describe("generateUploadUrl", () => {
  it("returns a URL string from ctx.storage", async () => {
    const storage = createMockStorage();
    const db = createMockDb();
    const ctx = { db, storage };
    const result = await usersModule.generateUploadUrl.handler(ctx, {});
    expect(result).toBe("https://upload.convex.cloud/mock-upload-url");
    expect(storage.generateUploadUrl).toHaveBeenCalledTimes(1);
  });
});

describe("updateAvatar", () => {
  it("creates a new user record when none exists", async () => {
    const storage = createMockStorage();
    const db = createMockDb([]);
    const ctx = { db, storage };

    await usersModule.updateAvatar.handler(ctx, {
      cdpUserId: "user_new",
      walletAddress: "0xABC",
      storageId: "storage_123",
    });

    expect(db.insert).toHaveBeenCalledWith("users", {
      cdpUserId: "user_new",
      username: "",
      walletAddress: "0xABC",
      avatarStorageId: "storage_123",
    });
  });

  it("patches existing user with new avatarStorageId", async () => {
    const existingUser: MockUser = {
      _id: "id_0",
      _creationTime: 1000,
      cdpUserId: "user_existing",
      username: "alice",
      walletAddress: "0xDEF",
    };
    const storage = createMockStorage();
    const db = createMockDb([existingUser]);
    const ctx = { db, storage };

    await usersModule.updateAvatar.handler(ctx, {
      cdpUserId: "user_existing",
      walletAddress: "0xDEF",
      storageId: "storage_456",
    });

    expect(db.patch).toHaveBeenCalledWith("id_0", {
      avatarStorageId: "storage_456",
    });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("deletes old avatar storage file when replacing", async () => {
    const existingUser: MockUser = {
      _id: "id_0",
      _creationTime: 1000,
      cdpUserId: "user_existing",
      username: "alice",
      walletAddress: "0xDEF",
      avatarStorageId: "old_storage_id",
    };
    const storage = createMockStorage();
    const db = createMockDb([existingUser]);
    const ctx = { db, storage };

    await usersModule.updateAvatar.handler(ctx, {
      cdpUserId: "user_existing",
      walletAddress: "0xDEF",
      storageId: "new_storage_id",
    });

    expect(storage.delete).toHaveBeenCalledWith("old_storage_id");
    expect(db.patch).toHaveBeenCalledWith("id_0", {
      avatarStorageId: "new_storage_id",
    });
  });

  it("does not call storage.delete when user has no previous avatar", async () => {
    const existingUser: MockUser = {
      _id: "id_0",
      _creationTime: 1000,
      cdpUserId: "user_existing",
      username: "alice",
      walletAddress: "0xDEF",
    };
    const storage = createMockStorage();
    const db = createMockDb([existingUser]);
    const ctx = { db, storage };

    await usersModule.updateAvatar.handler(ctx, {
      cdpUserId: "user_existing",
      walletAddress: "0xDEF",
      storageId: "storage_789",
    });

    expect(storage.delete).not.toHaveBeenCalled();
  });
});

describe("getByWalletAddress", () => {
  it("returns avatarUrl when user has avatarStorageId", async () => {
    const user: MockUser = {
      _id: "id_0",
      _creationTime: 1000,
      cdpUserId: "user_1",
      username: "bob",
      walletAddress: "0x111",
      avatarStorageId: "storage_abc",
    };
    const storage = createMockStorage({
      storage_abc: "https://convex.cloud/storage_abc.jpg",
    });
    const db = createMockDb([user]);
    const ctx = { db, storage };

    const result = await usersModule.getByWalletAddress.handler(ctx, {
      walletAddress: "0x111",
    });

    expect(result).not.toBeNull();
    expect(result.avatarUrl).toBe("https://convex.cloud/storage_abc.jpg");
    expect(result.username).toBe("bob");
  });

  it("returns avatarUrl: null when user has no avatar", async () => {
    const user: MockUser = {
      _id: "id_0",
      _creationTime: 1000,
      cdpUserId: "user_1",
      username: "carol",
      walletAddress: "0x222",
    };
    const storage = createMockStorage();
    const db = createMockDb([user]);
    const ctx = { db, storage };

    const result = await usersModule.getByWalletAddress.handler(ctx, {
      walletAddress: "0x222",
    });

    expect(result).not.toBeNull();
    expect(result.avatarUrl).toBeNull();
  });

  it("returns null when user does not exist", async () => {
    const storage = createMockStorage();
    const db = createMockDb([]);
    const ctx = { db, storage };

    const result = await usersModule.getByWalletAddress.handler(ctx, {
      walletAddress: "0xNONE",
    });

    expect(result).toBeNull();
  });
});

describe("getUserAvatars", () => {
  it("returns avatar URLs for known users", async () => {
    const users: MockUser[] = [
      {
        _id: "id_0",
        _creationTime: 1000,
        cdpUserId: "u1",
        username: "alice",
        walletAddress: "0xAAA",
        avatarStorageId: "s1",
      },
      {
        _id: "id_1",
        _creationTime: 1001,
        cdpUserId: "u2",
        username: "bob",
        walletAddress: "0xBBB",
        avatarStorageId: "s2",
      },
    ];
    const storage = createMockStorage({
      s1: "https://convex.cloud/s1.jpg",
      s2: "https://convex.cloud/s2.jpg",
    });
    const db = createMockDb(users);
    const ctx = { db, storage };

    const result = await usersModule.getUserAvatars.handler(ctx, {
      addresses: ["0xAAA", "0xBBB"],
    });

    expect(result["0xAAA"]).toEqual({
      avatarUrl: "https://convex.cloud/s1.jpg",
      username: "alice",
    });
    expect(result["0xBBB"]).toEqual({
      avatarUrl: "https://convex.cloud/s2.jpg",
      username: "bob",
    });
  });

  it("returns null for unknown addresses", async () => {
    const storage = createMockStorage();
    const db = createMockDb([]);
    const ctx = { db, storage };

    const result = await usersModule.getUserAvatars.handler(ctx, {
      addresses: ["0xUNKNOWN"],
    });

    expect(result["0xUNKNOWN"]).toBeNull();
  });

  it("returns mixed results for known and unknown addresses", async () => {
    const users: MockUser[] = [
      {
        _id: "id_0",
        _creationTime: 1000,
        cdpUserId: "u1",
        username: "alice",
        walletAddress: "0xAAA",
        avatarStorageId: "s1",
      },
    ];
    const storage = createMockStorage({
      s1: "https://convex.cloud/s1.jpg",
    });
    const db = createMockDb(users);
    const ctx = { db, storage };

    const result = await usersModule.getUserAvatars.handler(ctx, {
      addresses: ["0xAAA", "0xZZZ"],
    });

    expect(result["0xAAA"]).toEqual({
      avatarUrl: "https://convex.cloud/s1.jpg",
      username: "alice",
    });
    expect(result["0xZZZ"]).toBeNull();
  });

  it("returns avatarUrl: null for user without avatar", async () => {
    const users: MockUser[] = [
      {
        _id: "id_0",
        _creationTime: 1000,
        cdpUserId: "u1",
        username: "carol",
        walletAddress: "0xCCC",
      },
    ];
    const storage = createMockStorage();
    const db = createMockDb(users);
    const ctx = { db, storage };

    const result = await usersModule.getUserAvatars.handler(ctx, {
      addresses: ["0xCCC"],
    });

    expect(result["0xCCC"]).toEqual({
      avatarUrl: null,
      username: "carol",
    });
  });

  it("returns empty object for empty addresses array", async () => {
    const storage = createMockStorage();
    const db = createMockDb([]);
    const ctx = { db, storage };

    const result = await usersModule.getUserAvatars.handler(ctx, {
      addresses: [],
    });

    expect(result).toEqual({});
  });
});
