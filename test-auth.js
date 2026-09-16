import { getAuthenticatedOctokit } from './auth.js';

const octokit = await getAuthenticatedOctokit();
console.log("Octokit instance created. Token is valid.");
// A simple API call to verify the token works
const { data: user } = await octokit.rest.users.getAuthenticated();
console.log(`Logged in as: ${user.login}`);