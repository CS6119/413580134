import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  linkWithCredential,
  GoogleAuthProvider,
  updatePassword,
  signInWithCredential,
} from "firebase/auth";

function googleCredential(email, subject) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "none", typ: "JWT" })}.${encode({ iss: "https://accounts.google.com", aud: "demo-client", sub: subject, email, email_verified: true, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })}.`;
  return GoogleAuthProvider.credential(token);
}

test("email account linked to Google keeps its uid across both sign-in methods", async () => {
  const app = initializeApp(
    { apiKey: "demo-key", projectId: "demo-group-workspace" },
    "email-first",
  );
  try {
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    const email = `email-first-${randomUUID()}@example.test`;
    const password = "EmulatorOnly123!";
    const initial = await createUserWithEmailAndPassword(auth, email, password);
    const uid = initial.user.uid;
    const google = googleCredential(email, `google-${randomUUID()}`);
    await linkWithCredential(initial.user, google);
    assert.equal(auth.currentUser.uid, uid);
    await signOut(auth);
    assert.equal((await signInWithCredential(auth, google)).user.uid, uid);
    await signOut(auth);
    assert.equal(
      (await signInWithEmailAndPassword(auth, email, password)).user.uid,
      uid,
    );
  } finally {
    await deleteApp(app);
  }
});

test("Google account linked to a password keeps its uid", async () => {
  const app = initializeApp(
    { apiKey: "demo-key", projectId: "demo-group-workspace" },
    "google-first",
  );
  try {
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    const email = `google-first-${randomUUID()}@example.test`;
    const password = "EmulatorOnly123!";
    const google = googleCredential(email, `google-${randomUUID()}`);
    const initial = await signInWithCredential(auth, google);
    const uid = initial.user.uid;
    assert.equal(initial.user.email, email);
    assert.deepEqual(
      initial.user.providerData.map((p) => p.providerId),
      ["google.com"],
    );
    await updatePassword(initial.user, password);
    await signOut(auth);
    const result = await signInWithEmailAndPassword(auth, email, password);
    assert.equal(result.user.uid, uid);
    assert.deepEqual(result.user.providerData.map((p) => p.providerId).sort(), [
      "google.com",
      "password",
    ]);
  } finally {
    await deleteApp(app);
  }
});
