// auth.js
import { Octokit } from "@octokit/rest";
import { createOAuthDeviceAuth } from "@octokit/auth-oauth-device";

const CLIENT_ID = "Ov23liosvf6mN81olleQ"; // Replace with your actual Client ID

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
