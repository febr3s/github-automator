import { Octokit } from "@octokit/rest";
import { createOAuthDeviceAuth } from "@octokit/auth-oauth-device";

console.log("Octokit imported:", !!Octokit);
console.log("Device auth imported:", !!createOAuthDeviceAuth);
