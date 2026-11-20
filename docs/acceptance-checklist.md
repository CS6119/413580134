# Group 04 acceptance checklist

This checklist is organized around observable acceptance evidence, not team roles.

## 1. Product requirements and scope

- [ ] MVP value is defined: private Firebase account with private task management.
- [ ] Authentication User Stories cover login, registration, logout, password reset, and provider linking.
- [ ] Task User Stories cover create, edit, delete, status change, search/filter, and real-time sync.
- [ ] Edge cases are defined: invalid email/password, weak password, duplicate account, provider conflict, unauthorized access, missing parent profile, invalid fields, and text length limits.
- [ ] Scope remains limited to the MVP; no shared workspaces or cross-user task access were added.
- [ ] Acceptance scenarios are reproducible from the README and test files.

Evidence:

- `README.md`
- `src/main.ts`
- `tests/auth.test.mjs`
- `tests/firestore.test.mjs`
- `tests/e2e/app.spec.ts`

## 2. Architecture and contract governance

- [ ] Repository-wide constraints are documented in `.github/copilot-instructions.md`.
- [ ] The frontend entry points and Firebase initialization boundaries are explicit.
- [ ] The profile/task data contracts are documented and match `firestore.rules`.
- [ ] Cross-domain access is denied by default; only the authenticated owner may access private data.
- [ ] Secrets and generated test output are excluded from commits.

Evidence:

- `.github/copilot-instructions.md`
- `src/firebase.ts`
- `src/firebase-config.json`
- `firestore.rules`
- `.gitignore`

## 3. Domain A: authentication and account linking

- [ ] Google sign-in works or fails explicitly when provider configuration is invalid.
- [ ] Email/password registration and login work.
- [ ] Password reset follows the Firebase-auth-supported flow.
- [ ] Email-first and Google-first account linking preserve the same UID.
- [ ] Account linking does not merge unrelated existing identities.
- [ ] Auth-visible UI states and error messages are clear.

Evidence:

- `src/main.ts`
- `tests/auth.test.mjs`
- `README.md` account-linking section

## 4. Domain B: private task management

- [ ] Users can create, edit, delete, and change task status.
- [ ] Search and status filtering work.
- [ ] Tasks synchronize in real time.
- [ ] Create/update validation matches the 160-character title, 2,000-character notes, and status constraints.
- [ ] Users cannot forge owner UID or modify immutable timestamps.

Evidence:

- `src/main.ts`
- `src/firebase.ts`
- `firestore.rules`
- `tests/firestore.test.mjs`

## 5. Integration and UX quality

- [ ] Pull Requests contain scoped, reviewable changes.
- [ ] Security and rule regressions are prevented by emulator tests.
- [ ] Desktop and mobile UI are usable.
- [ ] Loading, empty, success, confirmation, and error states are visible and understandable.
- [ ] Playwright covers the login page and authentication mode switching.
- [ ] CI runs build, Emulator tests, and Playwright tests on changes to relevant code.

Evidence:

- GitHub Pull Requests
- `.github/workflows/ci.yml`
- `playwright.config.ts`
- `tests/e2e/app.spec.ts`
- `npm run build`
- `npm test`
- `npm run test:e2e`

## Final demo script

1. Open the app at `http://127.0.0.1:5173/`.
2. Register or sign in with email/password.
3. Create, edit, filter, update, and delete a task.
4. Demonstrate an account linking flow and verify the UID remains unchanged.
5. Sign out and verify the previous user's private data is not accessible.
6. Show a Playwright test run.
7. Show the emulator security tests.
8. Show the production build and open Pull Request.
