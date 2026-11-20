# Repository-wide Copilot instructions

## Product scope

- The MVP provides Firebase authentication and a private per-user task workspace.
- Keep changes focused on authentication/account linking or task management.
- Do not add admin roles, shared workspaces, team membership, or cross-user data access unless a written User Story and security-rule change explicitly request it.

## Architecture constraints

- `src/main.ts` owns UI rendering and user interactions.
- `src/firebase.ts` owns Firebase SDK initialization and emulator opt-in.
- `src/firebase-config.json` contains public Firebase Web configuration only. Never place an Admin private key or user credential in frontend code or this file.
- Firestore data uses `users/{uid}` for profiles and `users/{uid}/tasks/{taskId}` for private tasks.
- Users may access only their own profile and task subcollection. Cross-user reads and writes are forbidden.
- Frontend Firebase configuration is public. Authorization must come from Firebase Authentication and `firestore.rules`, never from a hidden API key.

## Data contracts

- Profile fields:
  - `uid: string`
  - `displayName: string`, 1-80 characters
  - `createdAt: serverTimestamp`
  - `updatedAt: serverTimestamp`
- Task fields:
  - `ownerUid: string`, matching the authenticated user and immutable after creation
  - `title: string`, 1-160 characters
  - `notes: string`, maximum 2,000 characters
  - `status: "todo" | "doing" | "done"`
  - `createdAt: serverTimestamp`
  - `updatedAt: serverTimestamp`
- No unspecified fields may be written by clients.
- `createdAt` is immutable. `uid`, `ownerUid`, and profile ownership fields cannot be forged or changed.

## Security and implementation rules

- Every Firestore write must be compatible with `firestore.rules`.
- Preserve schema validation, timestamp validation, field allowlists, and parent-profile checks.
- Escape user-provided text before HTML interpolation.
- Keep emulator opt-in explicit through `VITE_USE_EMULATORS === "true"`; normal local development connects to the configured Firebase project.
- Do not commit `.env*`, credentials, private keys, emulator artifacts, or Playwright test output.
- Keep a feature change on a dedicated branch and make it available through a Pull Request.

## Testing requirements

- Add emulator tests for any change to authentication linking or Firestore authorization/schema.
- Add Playwright coverage for user-visible authentication or task workflows.
- Run:
  - `npm run build`
  - `npm test`
  - `npm run test:e2e`
- A UI change must maintain desktop and mobile layout. Verify loading, empty, success, and error states.
