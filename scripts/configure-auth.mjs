import { mkdir, writeFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

// Keep the project owner's support email out of the public repository.
const supportEmail = process.env.FIREBASE_SUPPORT_EMAIL;
if (!supportEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
  console.error(
    "Set FIREBASE_SUPPORT_EMAIL to the project owner/support email before running this command.",
  );
  process.exit(1);
}
const projectId = "uxd2026-413580134";
const temp = path.resolve(".firebase/auth-config.json");
await mkdir(path.dirname(temp), { recursive: true });
try {
  await writeFile(
    temp,
    JSON.stringify(
      {
        auth: {
          providers: {
            emailPassword: true,
            googleSignIn: {
              oAuthBrandDisplayName: "Group 04",
              supportEmail,
              authorizedRedirectUris: [
                `https://${projectId}.firebaseapp.com/__/auth/handler`,
              ],
            },
          },
        },
      },
      null,
      2,
    ),
  );
  const result = spawnSync(
    process.execPath,
    [
      path.resolve("node_modules/firebase-tools/lib/bin/firebase.js"),
      "deploy",
      "--only",
      "auth",
      "--project",
      projectId,
      "--config",
      temp,
    ],
    { stdio: "inherit" },
  );
  process.exitCode = result.status ?? 1;
} finally {
  await rm(temp, { force: true });
}
