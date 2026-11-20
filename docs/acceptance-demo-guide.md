# Acceptance demo guide

## 1. Project startup

### Prerequisites

- Node.js 24 or newer
- Java 21 or newer for Firebase Emulator tests
- Git

### Start the application

```powershell
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/`.

The normal development configuration uses the Firebase project
`uxd2026-413580134` through `src/firebase-config.json`. It connects to the real
Firebase services unless emulator opt-in is explicitly enabled.

### Optional emulator mode

Set `VITE_USE_EMULATORS="true"` in `.env.local`, then start:

```powershell
npm run dev
```

This connects Authentication and Firestore UI operations to
`127.0.0.1:9099` and `127.0.0.1:8080`.

### Quality commands

```powershell
npm run build
npm test
npm run test:e2e
npx playwright install chromium
```

Java 21 is required by `npm test`. After installing Temurin 21, verify:

```powershell
java -version
```

## 2. Demo User Stories

### US-01 Email/password account

**As a** course user, **I want** to register and sign in with email/password,
**so that** I can access only my private workspace.

Acceptance Criteria:

- Invalid email or weak password produces a visible error.
- A valid registration creates the Firebase user and `users/{uid}` profile.
- Login shows the task workspace.
- Logout returns to the login screen.
- No unauthenticated user can read or write private tasks.

### US-02 Account linking

**As a** signed-in user, **I want** to link password and Google providers,
**so that** both methods retain the same UID and task data.

Acceptance Criteria:

- Google-first and email-first flows both preserve the original UID.
- Linking requires control of the new login provider.
- A provider already used by another UID is not silently merged.
- Account conflict errors are understandable.

### US-03 Private task CRUD

**As a** signed-in user, **I want** to create, edit, filter, search, update and
delete tasks, **so that** I can track my private course progress.

Acceptance Criteria:

- Creating a blank or overlength title is rejected.
- Notes cannot exceed 2,000 characters.
- Status is limited to `todo`, `doing`, or `done`.
- Another authenticated UID cannot read or modify this task.
- Updates preserve `ownerUid` and `createdAt`.
- Deleting a task requires confirmation.

### US-04 Real-time synchronization

**As a** user with an open task workspace, **I want** changes to appear without
reload, **so that** my progress stays current.

Acceptance Criteria:

- Task create/edit/status/delete updates appear through `onSnapshot`.
- Loading, empty, success and permission-error states remain understandable.

## 3. Vertical closed-loop delivery evidence

| Layer | Implementation evidence | Contract evidence |
| --- | --- | --- |
| UI | `src/main.ts`, `src/style.css` | accessible labels, dialogs, filters, toasts |
| State | Firebase `onSnapshot` and local task state | status/type unions and loading state |
| Authentication | Firebase Auth SDK | provider UID and account-link rules |
| Firestore API | `src/firebase.ts`, `src/main.ts` | profile/task field contracts |
| Authorization | `firestore.rules` | owner-only access and immutable fields |
| Tests | Auth and Firestore Emulator tests | denial/success and schema edge cases |
| Browser test | `tests/e2e/app.spec.ts` | login-page and registration-mode smoke |
| Delivery | GitHub PR and CI workflow | build, test and E2E gates |

## 4. Detail and UX acceptance

Demonstrate:

- Desktop and narrow/mobile layout.
- Loading and empty states.
- Confirmation before task deletion.
- Search and status filters.
- Clear Firebase auth error messages.
- Rerender after real-time Firestore changes.
- Dialog close/cancel behavior.
- No cross-user profile/task access.

## 5. PR review and conflict checklist

Before merging a Pull Request:

1. Keep it focused on one MVP feature or contract change.
2. Confirm the PR changes only its stated scope.
3. Re-run `npm run build`, `npm test`, and `npm run test:e2e`.
4. Review every Firestore field and rule change for authorization impact.
5. Verify generated files and secrets are not included.
6. Resolve merge conflicts by comparing both feature diffs, not one-sidedly.
7. Re-run tests after conflict resolution.
8. Request or document a review before merge.

Useful conflict process:

```text
git fetch origin
git switch main
git pull
git switch <feature-branch>
git merge main
# resolve conflicts
git add <resolved-files>
git commit
git push
```

Do not merge conflict resolutions that only make the build compile; re-run the
security and browser tests.
