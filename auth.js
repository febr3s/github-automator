// auth.js
import dotenv from 'dotenv';
dotenv.config(); // Load variables from .env into process.env


import { Octokit } from "@octokit/rest";
import { createOAuthDeviceAuth } from "@octokit/auth-oauth-device";

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;

if (!CLIENT_ID) {
  throw new Error("GITHUB_CLIENT_ID is not set. Please create a .env file based on .env.example.");
}

export async function getAuthenticatedOctokit() {
  const auth = createOAuthDeviceAuth({
    clientType: "oauth-app",
    clientId: CLIENT_ID,
    scopes: ["public_repo", "workflow"], // Scopes needed for fork, edit, Actions, Pages
    onVerification(verification) {
      console.log("\n--- ACTION REQUIRED ---");
      console.log(`1. Open this URL in your browser: ${verification.verification_uri}`);
      console.log(`2. Enter this code: ${verification.user_code}`);
      console.log("-----------------------\n");
    },
  });

  console.log("Requesting device code from GitHub...");
  const authentication = await auth({ type: "oauth" });
  console.log("✅ Authentication successful!");

  return new Octokit({ auth: authentication.token });
}
