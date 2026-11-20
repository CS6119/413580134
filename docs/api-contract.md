# Firebase SDK API contract

This project uses Firebase Web SDK operations directly. It does not expose a
REST HTTP API.

## Authentication operations

| Operation | Firebase SDK |
| --- | --- |
| Create email/password account | `createUserWithEmailAndPassword` |
| Sign in with email/password | `signInWithEmailAndPassword` |
| Google sign-in | `signInWithPopup` with `GoogleAuthProvider` |
| Sign out | `signOut` |
| Reset password | `sendPasswordResetEmail` |
| Update display name/password | `updateProfile`, `updatePassword` |
| Link provider | `linkWithPopup`, `linkWithCredential` |

Identity contract:

- `uid` is the stable Firebase identity identifier.
- Linking must preserve the existing UID.
- Authentication state comes from `onAuthStateChanged`.

## Firestore paths

| Resource | Path | Access |
| --- | --- | --- |
| User profile | `users/{uid}` | Authenticated owner only |
| Task | `users/{uid}/tasks/{taskId}` | Authenticated owner only |

## Profile contract

```ts
type UserProfile = {
  uid: string;
  displayName: string; // 1-80 characters
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

Rules:

- `uid` must match the profile path UID.
- `displayName` is 1-80 characters.
- No role or admin field may be created through the client.
- Profile deletion is not allowed.

## Task contract

```ts
type TaskStatus = "todo" | "doing" | "done";

type Task = {
  ownerUid: string;
  title: string; // 1-160 characters
  notes: string; // 0-2,000 characters
  status: TaskStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

Rules:

- `ownerUid` equals `request.auth.uid`.
- `ownerUid` and `createdAt` are immutable after creation.
- Timestamp fields must use server timestamps.
- No unspecified fields are allowed.
- Task queries are limited to the owner subcollection and 100 latest records.

## Frontend operations

| UI action | Firestore operation |
| --- | --- |
| Ensure profile | `runTransaction` |
| Load tasks | `onSnapshot(query(..., orderBy("createdAt", "desc"), limit(100)))` |
| Create task | `addDoc` |
| Edit task | `updateDoc` |
| Change status | `updateDoc` |
| Delete task | `deleteDoc` |

## Emulator endpoints

| Service | Endpoint |
| --- | --- |
| Firebase Auth Emulator | `127.0.0.1:9099` |
| Firestore Emulator | `127.0.0.1:8080` |

Emulator use is intentionally opt-in through
`VITE_USE_EMULATORS === "true"`.
