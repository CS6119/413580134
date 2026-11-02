import { before, after, beforeEach, test } from "node:test";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  query,
  orderBy,
  limit,
  deleteField,
} from "firebase/firestore";

let env;
let alice;
let bob;
const profile = (uid) => ({
  uid,
  displayName: uid,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
const task = (extra = {}) => ({
  ownerUid: "alice",
  title: "測試作業",
  notes: "",
  status: "todo",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-group-workspace",
    firestore: { rules: await readFile("firestore.rules", "utf8") },
  });
});
beforeEach(async () => {
  await env.clearFirestore();
  alice = env.authenticatedContext("alice").firestore();
  bob = env.authenticatedContext("bob").firestore();
  await setDoc(doc(alice, "users/alice"), profile("alice"));
  await setDoc(doc(bob, "users/bob"), profile("bob"));
});
after(async () => {
  await env?.cleanup();
});

test("owner can create, list in app query order, update and delete a task", async () => {
  const ref = doc(alice, "users/alice/tasks/one");
  await assertSucceeds(setDoc(ref, task()));
  await assertSucceeds(
    getDocs(
      query(
        collection(alice, "users/alice/tasks"),
        orderBy("createdAt", "desc"),
        limit(100),
      ),
    ),
  );
  await assertSucceeds(
    updateDoc(ref, { status: "doing", updatedAt: serverTimestamp() }),
  );
  await assertSucceeds(
    updateDoc(ref, {
      title: "更新作業",
      status: "done",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(deleteDoc(ref));
});
test("unauthenticated clients cannot read profiles or list tasks", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "users/alice")));
  await assertFails(getDocs(collection(db, "users/alice/tasks")));
  await assertFails(setDoc(doc(db, "users/alice/tasks/one"), task()));
});
test("a second account cannot read, list, create, update or delete another user data", async () => {
  await setDoc(doc(alice, "users/alice/tasks/one"), task());
  await assertFails(getDoc(doc(bob, "users/alice")));
  await assertFails(getDoc(doc(bob, "users/alice/tasks/one")));
  await assertFails(getDocs(collection(bob, "users/alice/tasks")));
  await assertFails(setDoc(doc(bob, "users/alice/tasks/two"), task()));
  await assertFails(
    updateDoc(doc(bob, "users/alice/tasks/one"), {
      status: "done",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(deleteDoc(doc(bob, "users/alice/tasks/one")));
});
test("task ownership cannot be forged at create or update", async () => {
  const ref = doc(alice, "users/alice/tasks/one");
  await assertFails(setDoc(ref, task({ ownerUid: "bob" })));
  await setDoc(ref, task());
  await assertFails(
    updateDoc(ref, { ownerUid: "bob", updatedAt: serverTimestamp() }),
  );
});
test("updates cannot bypass size limits or change field types", async () => {
  const ref = doc(alice, "users/alice/tasks/one");
  await setDoc(ref, task());
  for (const extra of [
    { title: "x".repeat(161) },
    { notes: "x".repeat(2001) },
    { title: 123 },
    { notes: [] },
    { status: "admin" },
  ]) {
    await assertFails(
      updateDoc(ref, { ...extra, updatedAt: serverTimestamp() }),
    );
  }
});
test("create requires valid strings and complete schema", async () => {
  const ref = doc(alice, "users/alice/tasks/one");
  for (const extra of [
    { title: "" },
    { title: "x".repeat(161) },
    { notes: "x".repeat(2001) },
    { title: true },
    { unexpected: "value" },
  ]) {
    await assertFails(setDoc(ref, task(extra)));
  }
  const incomplete = task();
  delete incomplete.notes;
  await assertFails(setDoc(ref, incomplete));
});
test("required fields cannot be deleted on update", async () => {
  const ref = doc(alice, "users/alice/tasks/one");
  await setDoc(ref, task());
  await assertFails(
    updateDoc(ref, { notes: deleteField(), updatedAt: serverTimestamp() }),
  );
});
test("timestamps cannot be forged and createdAt is immutable", async () => {
  const ref = doc(alice, "users/alice/tasks/one");
  await assertFails(setDoc(ref, task({ createdAt: Timestamp.fromMillis(1) })));
  await setDoc(ref, task());
  await assertFails(
    updateDoc(ref, {
      createdAt: Timestamp.fromMillis(2),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(ref, { title: "changed", updatedAt: Timestamp.fromMillis(1) }),
  );
});
test("profile owner can edit name but cannot add roles, change uid or modify creation timestamp", async () => {
  const ref = doc(alice, "users/alice");
  await assertSucceeds(
    updateDoc(ref, { displayName: "測試同學", updatedAt: serverTimestamp() }),
  );
  for (const extra of [
    { uid: "bob" },
    { isAdmin: true },
    { displayName: "x".repeat(81) },
    { displayName: "" },
    { createdAt: Timestamp.fromMillis(1) },
    { displayName: deleteField() },
  ]) {
    await assertFails(
      updateDoc(ref, { ...extra, updatedAt: serverTimestamp() }),
    );
  }
  await assertFails(deleteDoc(ref));
});
test("a missing parent profile cannot be bypassed through a subcollection", async () => {
  const db = env.authenticatedContext("orphan").firestore();
  await assertFails(
    setDoc(doc(db, "users/orphan/tasks/one"), task({ ownerUid: "orphan" })),
  );
});
test("unspecified paths are denied by default", async () => {
  await assertFails(setDoc(doc(alice, "admins/alice"), { admin: true }));
  await assertFails(getDocs(collection(alice, "users")));
});
