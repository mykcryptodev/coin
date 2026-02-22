# Username Feature: Profile Management & Payment Resolution

## TL;DR

> **Quick Summary**: Add a `users` table to Convex with unique usernames, let users set/update their @username on the profile page, and extend the payment flow to resolve @username recipients to wallet addresses.
> 
> **Deliverables**:
> - Convex `users` table with unique username index
> - Username CRUD mutations/queries in `convex/users.ts`
> - Username editing UI on the profile page (`me.tsx`)
> - @username recipient detection and resolution in payment flow (`pay.tsx`)
> - @username display in activity feed (`index.tsx`)
> - `recipientUsername` field on transactions
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 (schema) -> Task 2 (mutations) -> Tasks 3,4,5 (parallel UI changes)

---

## Context

### Original Request
Users should be able to create and update a username on their profile page. This is NOT part of onboarding — it's something they can do whenever they choose. Usernames must be unique in the Convex database. Users should be able to pay people by their @username in addition to email and 0x address.

### Interview Summary
**Key Discussions**:
- **Username format**: Social-style @username (like Venmo). Stored lowercase without `@`, displayed with `@` prefix.
- **Character rules**: Lowercase alphanumeric + underscores, 3-20 chars, case-insensitive (stored lowercase).
- **Timing**: Not onboarding. Optional. Users go to profile page to set it whenever.
- **Payment**: @username is a third recipient type alongside email and 0x address.

### Metis Review
**Identified Gaps** (all addressed):
- **User creation timing**: Resolved — user record created when they first set a username (not on login).
- **Username availability UX**: Resolved — real-time availability check as user types.
- **Wallet uniqueness**: Resolved — one username per wallet address (unique index on walletAddress).
- **Input detection ambiguity**: Resolved — `@username` (starts with @, only alphanumeric/underscore after) vs `email@domain.com` (contains @ in middle with domain) vs `0x...` (starts with 0x).
- **Unknown username**: Resolved — show "Username not found" error before payment attempt.
- **Reserved words**: Out of scope — no reserved word blocking.
- **Sender username display**: Out of scope — only recipient usernames shown.

---

## Work Objectives

### Core Objective
Enable users to claim a unique @username on their profile and receive payments via that username.

### Concrete Deliverables
- `convex/schema.ts` — new `users` table definition
- `convex/users.ts` — new file with mutations (setUsername) and queries (getByUsername, getByWalletAddress, checkUsernameAvailable)
- `app/(tabs)/me.tsx` — username card with edit/save UI
- `app/(tabs)/pay.tsx` — @username detection and resolution in recipient input
- `convex/schema.ts` — `recipientUsername` field added to transactions table
- `convex/transactions.ts` — accept `recipientUsername` in create mutation
- `app/(tabs)/index.tsx` — display @username in activity feed when available

### Definition of Done
- [ ] User can set a username on their profile page
- [ ] User can update their username to a new one
- [ ] Duplicate usernames are rejected with clear error message
- [ ] User can pay someone by entering @username in the pay screen
- [ ] Activity feed shows @username for recipients who were paid by username
- [ ] `npx convex dev --once` deploys without errors

### Must Have
- Unique username constraint enforced at database level
- Case-insensitive usernames (stored lowercase)
- 3-20 character limit, alphanumeric + underscores only
- Real-time username availability check
- @username recipient type in payment flow
- `recipientUsername` stored on transactions

### Must NOT Have (Guardrails)
- NO changes to onboarding flow
- NO profile picture / avatar upload
- NO display name separate from username
- NO bio/description field
- NO username search/discovery feature
- NO username history tracking
- NO reserved username blocking
- NO username in sender display (only recipient)
- NO profanity filter
- NO rate limiting on username changes
- NO "username suggestions" feature

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (jest + jest-expo + @testing-library/react-native in devDependencies)
- **User wants tests**: Manual verification (not explicitly requested; focus on working feature)
- **Framework**: jest-expo (already configured)

### Verification Approach
Each TODO includes automated verification via shell commands (Convex deployment check) and structured manual verification via the running app.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Convex schema - add users table + recipientUsername field
└── (sequential) Task 2: Convex users.ts - mutations & queries

Wave 2 (After Wave 1):
├── Task 3: Profile page - username UI on me.tsx
├── Task 4: Payment flow - @username detection in pay.tsx
└── Task 5: Activity feed - @username display in index.tsx

Critical Path: Task 1 -> Task 2 -> Task 3 (profile) + Task 4 (payment)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 (Schema) | None | 2, 3, 4, 5 | None |
| 2 (Mutations/Queries) | 1 | 3, 4, 5 | None |
| 3 (Profile UI) | 2 | None | 4, 5 |
| 4 (Payment Flow) | 2 | None | 3, 5 |
| 5 (Activity Feed) | 2 | None | 3, 4 |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2 | Sequential: delegate_task(category="quick") for each |
| 2 | 3, 4, 5 | Parallel: delegate_task(category="quick", run_in_background=true) for each |

---

## TODOs

- [ ] 1. Add `users` table to Convex schema and `recipientUsername` to transactions

  **What to do**:
  - Add a `users` table to `convex/schema.ts` with fields:
    - `cdpUserId: v.string()` — the CDP user ID from `useCurrentUser().userId`
    - `username: v.string()` — the chosen username (stored lowercase, no @ prefix)
    - `walletAddress: v.string()` — the user's smart account address
  - Add indexes on users table:
    - `.index("by_username", ["username"])` — for unique lookup and payment resolution
    - `.index("by_walletAddress", ["walletAddress"])` — for profile page lookup
    - `.index("by_cdpUserId", ["cdpUserId"])` — for auth-based lookup
  - Add `recipientUsername: v.optional(v.string())` field to the existing `transactions` table definition (next to `recipientEmail`)

  **Must NOT do**:
  - Do NOT add displayName, bio, avatarUrl, or any other profile fields
  - Do NOT add a createdAt or updatedAt field (keep it minimal like the transactions table)
  - Do NOT modify any existing fields on the transactions table

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file edit, small and well-defined schema change
  - **Skills**: [`vercel-react-native-skills`]
    - `vercel-react-native-skills`: Provides React Native + Expo context for understanding the full stack

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (sequential with Task 2)
  - **Blocks**: Tasks 2, 3, 4, 5
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `convex/schema.ts:4-12` — Existing schema definition pattern. The `users` table should follow the same `defineTable({...}).index(...)` structure used for `transactions`.
  - `convex/schema.ts:11` — The `recipientEmail: v.optional(v.string())` field. The new `recipientUsername` field follows this exact pattern.

  **API/Type References**:
  - `convex/schema.ts:1-2` — Import pattern: `defineSchema`, `defineTable` from `convex/server`, `v` from `convex/values`.

  **Acceptance Criteria**:

  ```bash
  # Verify schema deploys successfully
  npx convex dev --once 2>&1
  # Assert: No errors. Output should show successful deployment.
  
  # Verify by reading the file
  grep -c "users:" convex/schema.ts
  # Assert: Returns 1
  
  grep -c "recipientUsername" convex/schema.ts
  # Assert: Returns 1
  
  grep "by_username" convex/schema.ts
  # Assert: Returns the index definition line
  
  grep "by_walletAddress" convex/schema.ts
  # Assert: Returns the index definition line
  ```

  **Commit**: YES
  - Message: `feat(convex): add users table and recipientUsername to transactions schema`
  - Files: `convex/schema.ts`
  - Pre-commit: `npx convex dev --once`

---

- [ ] 2. Create Convex users mutations and queries (`convex/users.ts`)

  **What to do**:
  - Create a new file `convex/users.ts` with the following functions:

  **Query: `getByWalletAddress`**
  - Args: `{ walletAddress: v.string() }`
  - Uses index `by_walletAddress` to look up user
  - Returns the user document or `null`
  - Used by: profile page to show current username

  **Query: `getByUsername`**
  - Args: `{ username: v.string() }`
  - Normalizes input to lowercase, strips leading `@` if present
  - Uses index `by_username` to look up user
  - Returns the user document or `null`
  - Used by: payment flow to resolve @username to wallet address

  **Query: `checkUsernameAvailable`**
  - Args: `{ username: v.string() }`
  - Normalizes input to lowercase
  - Validates format: `/^[a-z0-9_]{3,20}$/` (after lowercasing)
  - Uses index `by_username` to check if taken
  - Returns `{ available: boolean, error?: string }` where `error` explains why (e.g., "Username already taken", "Username must be 3-20 characters", "Only letters, numbers, and underscores allowed")

  **Mutation: `setUsername`**
  - Args: `{ cdpUserId: v.string(), username: v.string(), walletAddress: v.string() }`
  - Normalizes username to lowercase, strips leading `@` if present
  - Validates format: `/^[a-z0-9_]{3,20}$/`
  - Checks uniqueness by querying `by_username` index — if taken by a DIFFERENT user, throw error
  - Checks if user already exists by querying `by_cdpUserId` index:
    - If exists: update their username (using `ctx.db.patch(existingUser._id, { username })`)
    - If not exists: insert new user document with all three fields
  - Returns the username on success
  - Throws `ConvexError` on validation failure or uniqueness conflict

  **Must NOT do**:
  - Do NOT create delete/remove username functionality
  - Do NOT add any Convex actions (only queries and mutations — no external API calls needed)
  - Do NOT import or use the CDP SDK in this file
  - Do NOT add authentication/authorization middleware (the app passes cdpUserId from the client)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single new file creation with well-defined CRUD operations
  - **Skills**: [`vercel-react-native-skills`]
    - `vercel-react-native-skills`: Full-stack context for Convex patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (after Task 1)
  - **Blocks**: Tasks 3, 4, 5
  - **Blocked By**: Task 1 (needs schema deployed)

  **References**:

  **Pattern References** (existing code to follow):
  - `convex/transactions.ts:1-2` — Import pattern: `import { query, mutation } from "./_generated/server"` and `import { v } from "convex/values"`. Follow this exact import style.
  - `convex/transactions.ts:4-12` — Query pattern: `export const get = query({ args: {}, handler: async (ctx) => { ... } })`. The new queries should follow this structure with `ctx.db.query("users").withIndex(...)`.
  - `convex/transactions.ts:15-28` — Mutation pattern: `export const create = mutation({ args: { ... }, handler: async (ctx, args) => { await ctx.db.insert(...) } })`. The `setUsername` mutation should follow this structure.

  **API/Type References**:
  - `convex/transactions.ts:9` — Index usage pattern: `.withIndex("by_timestamp")`. Use `.withIndex("by_username", (q) => q.eq("username", normalizedUsername))` for username lookups.
  - `convex/transactions.ts:7` — Table query pattern: `ctx.db.query("transactions")`. Use `ctx.db.query("users")` similarly.

  **Acceptance Criteria**:

  ```bash
  # File exists
  test -f convex/users.ts && echo "PASS" || echo "FAIL"
  # Assert: PASS
  
  # Convex deploys with new functions
  npx convex dev --once 2>&1
  # Assert: No errors. Output should list users.setUsername, users.getByUsername, etc.
  
  # Verify all expected exports
  grep -c "export const" convex/users.ts
  # Assert: Returns 4 (getByWalletAddress, getByUsername, checkUsernameAvailable, setUsername)
  
  # Verify mutation uses validation
  grep "a-z0-9_" convex/users.ts
  # Assert: Returns the regex validation line
  ```

  **Commit**: YES
  - Message: `feat(convex): add username mutations and queries`
  - Files: `convex/users.ts`
  - Pre-commit: `npx convex dev --once`

---

- [ ] 3. Add username editing UI to profile page (`me.tsx`)

  **What to do**:
  - Add imports for `useMutation`, `useQuery` from `convex/react` (already imported: `useAction`)
  - Add import for `api` (already imported)
  - Query the current user's profile: `useQuery(api.users.getByWalletAddress, walletAddress ? { walletAddress } : "skip")`
  - Add a **Username card** between the Wallet card and Balance card with:
    - Header label "USERNAME" (uppercase, matches existing card label style from `balanceLabel` style)
    - If user HAS a username: display `@username` with an "Edit" icon button (pencil)
    - If user has NO username: display "Set your @username" prompt with a "Set" button
    - When editing/setting:
      - TextInput prefixed with `@` label (the @ is a static Text element, NOT part of the input value)
      - Input should `autoCapitalize="none"`, `autoCorrect={false}`
      - Real-time availability check: as user types (debounced ~500ms), call `useQuery(api.users.checkUsernameAvailable, ...)` and show:
        - Green checkmark + "Available" if available
        - Red X + error message if not available or invalid format
      - "Save" button (filled blue, matches `addMoneyButton` style) — calls `setUsername` mutation with `cdpUserId`, `username` (lowercase), `walletAddress`
      - "Cancel" button (outlined, matches `transferButton` style) — reverts to display mode
    - On save success: exit edit mode, show updated username
    - On save error: show Alert with error message

  **Must NOT do**:
  - Do NOT change the overall layout/structure of me.tsx (header, avatar, wallet card, balance card, sign out)
  - Do NOT add avatar upload or display name fields
  - Do NOT move or reorder existing cards
  - Do NOT modify the blue header section
  - Do NOT add a settings screen — username editing is inline on this page

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file modification with well-defined UI addition following existing patterns
  - **Skills**: [`vercel-react-native-skills`]
    - `vercel-react-native-skills`: React Native component patterns and hooks usage

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: None
  - **Blocked By**: Task 2 (needs Convex mutations deployed)

  **References**:

  **Pattern References** (existing code to follow):
  - `app/(tabs)/me.tsx:112-122` — Wallet card pattern. The username card should follow this exact structure: `<View style={styles.card}>` with a `cardHeader`, label, and content row.
  - `app/(tabs)/me.tsx:124-151` — Balance card with action buttons. The "Save" button should follow `addMoneyButton` style (filled blue) and "Cancel" should follow `transferButton` style (outlined blue).
  - `app/(tabs)/me.tsx:230-250` — Card styling: `backgroundColor: "#fff"`, `borderRadius: 16`, `padding: 20`, `marginBottom: 16`, `borderWidth: 1`, `borderColor: "#e8e8e8"`.
  - `app/(tabs)/me.tsx:244-250` — Label styling: `fontSize: 14`, `fontWeight: "600"`, `color: "#687076"`, `textTransform: "uppercase"`, `letterSpacing: 0.5`.
  - `app/(tabs)/me.tsx:4` — Import pattern for convex hooks: `import { useAction } from "convex/react"`. Add `useMutation, useQuery` to this import.
  - `app/(tabs)/me.tsx:44-50` — How `currentUser` is accessed for `walletAddress` and `userId`.

  **API/Type References**:
  - `convex/users.ts` (from Task 2) — `api.users.getByWalletAddress`, `api.users.checkUsernameAvailable`, `api.users.setUsername`

  **Acceptance Criteria**:

  ```bash
  # Verify username card exists in the file
  grep -c "USERNAME\|username\|setUsername" app/\(tabs\)/me.tsx
  # Assert: Returns > 0 (multiple references to username functionality)
  
  # Verify convex query import
  grep "useQuery" app/\(tabs\)/me.tsx
  # Assert: Returns import line with useQuery
  
  # Verify useMutation import
  grep "useMutation" app/\(tabs\)/me.tsx
  # Assert: Returns import line with useMutation
  
  # App compiles
  npx expo export --platform ios 2>&1 | tail -5
  # Assert: No compilation errors
  ```

  **Commit**: YES
  - Message: `feat(profile): add username editing UI to profile page`
  - Files: `app/(tabs)/me.tsx`
  - Pre-commit: `npx expo export --platform ios`

---

- [ ] 4. Add @username recipient detection and resolution to payment flow (`pay.tsx`)

  **What to do**:
  - Add a new detection function `isUsername(input: string): boolean`:
    - Returns `true` if input starts with `@` followed by 1+ alphanumeric/underscore characters
    - Pattern: `/^@[a-z0-9_]+$/i`
    - This takes priority over email detection (a username starts with `@` but has no domain part)
  - Update the existing `isEmail` function or detection logic to ensure proper precedence:
    - Input starts with `@` and matches username pattern → **username**
    - Input contains `@` in the middle and has domain (dot after @) → **email**
    - Input starts with `0x` → **0x address**
  - Add `useQuery` import and `api.users.getByUsername` query
  - Modify `handleSend` function to handle three recipient types:
    ```
    if (isUsername(recipient)):
      1. Query Convex: getByUsername({ username: recipient.slice(1) })
      2. If not found: Alert.alert("Error", "Username not found")
      3. If found: use user.walletAddress as resolvedAddress
      4. Set recipientUsername = recipient.slice(1) (without @)
    else if (isEmail(recipient)):
      (existing email flow — no changes)
    else:
      (existing 0x address flow — no changes)
    ```
  - Update the `createTransaction` call to include `recipientUsername` when paying by username
  - Update the success Alert to show `@username` when paid by username: `Sent $${amount} USDC to @${recipientUsername}`
  - Update the TextInput placeholder to: `"@username, email, or 0x address..."`
  - Username resolution should use `useAction` calling a Convex action OR inline the query lookup in the handler. Since `getByUsername` is a query (not mutation), use `useQuery` reactively or `useConvex().query()` imperatively inside handleSend. **Recommended approach**: Use the `useConvex` hook from `convex/react` to call `convexClient.query(api.users.getByUsername, { username })` imperatively inside `handleSend`, since the resolution happens on button press, not reactively.

  **Must NOT do**:
  - Do NOT modify the existing email resolution flow (resolveRecipient CDP action)
  - Do NOT modify the existing 0x address flow
  - Do NOT add username autocomplete or suggestions
  - Do NOT add a user picker/search UI
  - Do NOT change the amount input or note input

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file modification with clear logic additions following existing patterns
  - **Skills**: [`vercel-react-native-skills`]
    - `vercel-react-native-skills`: React Native hooks and Convex integration patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5)
  - **Blocks**: None
  - **Blocked By**: Task 2 (needs Convex queries deployed)

  **References**:

  **Pattern References** (existing code to follow):
  - `app/(tabs)/pay.tsx:18-20` — `isEmail()` detection function. The new `isUsername()` function should sit right next to this with the same style.
  - `app/(tabs)/pay.tsx:56-70` — Recipient resolution block. The username resolution should be a NEW `if` branch BEFORE the `isEmail` check: `if (isUsername(recipient)) { ... } else if (isEmail(recipient)) { ... } else { ... }`.
  - `app/(tabs)/pay.tsx:79-85` — Transaction creation with optional `recipientEmail`. Follow same pattern for `recipientUsername`: `...(recipientUsername ? { recipientUsername } : {})`.
  - `app/(tabs)/pay.tsx:87-92` — Success alert with conditional message. Add username variant.
  - `app/(tabs)/pay.tsx:36` — `useAction` usage for `resolveRecipient`. Username resolution does NOT need an action — it's a local DB query.

  **API/Type References**:
  - `convex/users.ts` (from Task 2) — `api.users.getByUsername` query returns `{ walletAddress, username, cdpUserId } | null`
  - `convex/transactions.ts:15-28` — Transaction create mutation args. Will accept `recipientUsername: v.optional(v.string())` after Task 1.

  **Acceptance Criteria**:

  ```bash
  # Verify isUsername function exists
  grep "isUsername" app/\(tabs\)/pay.tsx
  # Assert: Returns the function definition line
  
  # Verify placeholder updated
  grep "@username" app/\(tabs\)/pay.tsx
  # Assert: Returns the placeholder text line
  
  # Verify recipientUsername in transaction creation
  grep "recipientUsername" app/\(tabs\)/pay.tsx
  # Assert: Returns the transaction creation line
  
  # App compiles
  npx expo export --platform ios 2>&1 | tail -5
  # Assert: No compilation errors
  ```

  **Commit**: YES
  - Message: `feat(pay): add @username recipient resolution to payment flow`
  - Files: `app/(tabs)/pay.tsx`
  - Pre-commit: `npx expo export --platform ios`

---

- [ ] 5. Update activity feed to display @username for recipients + update transaction create mutation

  **What to do**:
  
  **Part A: Update `convex/transactions.ts` create mutation**
  - Add `recipientUsername: v.optional(v.string())` to the `create` mutation args (alongside existing `recipientEmail`)
  - Include it in the `ctx.db.insert` spread: `...args` already handles this since it spreads all args

  **Part B: Update activity feed display in `app/(tabs)/index.tsx`**
  - Update the `Transaction` type (line 46-54) to include `recipientUsername?: string`
  - Update the recipient display logic in `TransactionItem` (line 82):
    - Current: `{item.recipientEmail ?? shortenAddress(item.to)}`
    - New: `{item.recipientUsername ? `@${item.recipientUsername}` : item.recipientEmail ?? shortenAddress(item.to)}`
    - Priority: @username > email > shortened address

  **Must NOT do**:
  - Do NOT change sender display (only recipient)
  - Do NOT add clickable usernames or profile links
  - Do NOT modify the feed layout, colors, or other styling
  - Do NOT add username-based filtering or search to the feed

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two small edits across two files with minimal logic changes
  - **Skills**: [`vercel-react-native-skills`]
    - `vercel-react-native-skills`: React Native component patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: None
  - **Blocked By**: Task 2 (needs schema changes deployed)

  **References**:

  **Pattern References** (existing code to follow):
  - `convex/transactions.ts:15-28` — The `create` mutation. Add `recipientUsername` to `args` exactly like `recipientEmail` on line 21: `recipientUsername: v.optional(v.string())`. The `...args` spread on line 24-26 automatically includes it in the insert.
  - `app/(tabs)/index.tsx:46-54` — `Transaction` type definition. Add `recipientUsername?: string` field (same pattern as `recipientEmail?: string` on line 53).
  - `app/(tabs)/index.tsx:81-83` — Recipient display: `{item.recipientEmail ?? shortenAddress(item.to)}`. Wrap with username priority: `{item.recipientUsername ? \`@\${item.recipientUsername}\` : item.recipientEmail ?? shortenAddress(item.to)}`.

  **API/Type References**:
  - `convex/schema.ts` (after Task 1) — `recipientUsername: v.optional(v.string())` field on transactions table

  **Acceptance Criteria**:

  ```bash
  # Verify recipientUsername in transactions mutation
  grep "recipientUsername" convex/transactions.ts
  # Assert: Returns the args definition line
  
  # Verify Transaction type updated
  grep "recipientUsername" app/\(tabs\)/index.tsx
  # Assert: Returns type definition and display logic lines
  
  # Verify display priority logic
  grep "@" app/\(tabs\)/index.tsx | grep "recipientUsername"
  # Assert: Returns the template literal with @ prefix
  
  # Convex deploys
  npx convex dev --once 2>&1
  # Assert: No errors
  
  # App compiles
  npx expo export --platform ios 2>&1 | tail -5
  # Assert: No compilation errors
  ```

  **Commit**: YES
  - Message: `feat(transactions): add recipientUsername to transactions and activity feed`
  - Files: `convex/transactions.ts`, `app/(tabs)/index.tsx`
  - Pre-commit: `npx convex dev --once && npx expo export --platform ios`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(convex): add users table and recipientUsername to transactions schema` | `convex/schema.ts` | `npx convex dev --once` |
| 2 | `feat(convex): add username mutations and queries` | `convex/users.ts` | `npx convex dev --once` |
| 3 | `feat(profile): add username editing UI to profile page` | `app/(tabs)/me.tsx` | `npx expo export --platform ios` |
| 4 | `feat(pay): add @username recipient resolution to payment flow` | `app/(tabs)/pay.tsx` | `npx expo export --platform ios` |
| 5 | `feat(transactions): add recipientUsername to transactions and activity feed` | `convex/transactions.ts`, `app/(tabs)/index.tsx` | `npx convex dev --once` |

---

## Success Criteria

### Verification Commands
```bash
# All Convex functions deploy
npx convex dev --once
# Expected: Clean deployment, no errors

# App compiles for iOS
npx expo export --platform ios
# Expected: Clean export, no errors

# All new files exist
test -f convex/users.ts && echo "PASS" || echo "FAIL"
# Expected: PASS
```

### Final Checklist
- [ ] `users` table exists in Convex schema with username, cdpUserId, walletAddress
- [ ] Unique indexes on username and walletAddress
- [ ] setUsername mutation validates format (a-z, 0-9, underscore, 3-20 chars)
- [ ] setUsername mutation enforces uniqueness (throws on duplicate)
- [ ] setUsername mutation supports both create and update (upsert by cdpUserId)
- [ ] Profile page shows username card with edit/save UI
- [ ] Real-time availability check shows green/red indicator
- [ ] Payment screen detects @username and resolves to wallet address
- [ ] Payment screen shows "Username not found" for unknown usernames
- [ ] Transaction records recipientUsername when paid by username
- [ ] Activity feed shows @username with highest priority (over email and address)
- [ ] All "Must NOT Have" items are absent
