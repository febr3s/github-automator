// automate.js
import { getAuthenticatedOctokit } from './auth.js';

const ORIGINAL_OWNER = "RivoLink"; // Replace with the source repo owner
const ORIGINAL_REPO = "leaf"; // Replace with the source repo name

async function main() {
  const octokit = await getAuthenticatedOctokit();

  console.log(`Forking ${ORIGINAL_OWNER}/${ORIGINAL_REPO}...`);
  const { data: fork } = await octokit.rest.repos.createFork({
    owner: ORIGINAL_OWNER,
    repo: ORIGINAL_REPO,
  });

  console.log(`✅ Fork created: ${fork.full_name}`);
  // The fork might not be immediately ready; the API returns a 202 Accepted.
  // We'll wait a moment before trying to edit files.
  console.log("Waiting 5 seconds for the fork to be fully provisioned...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  return { octokit, forkOwner: fork.owner.login, forkRepo: fork.name };
}

const { octokit, forkOwner, forkRepo } = await main();
console.log(`Ready to work with ${forkOwner}/${forkRepo}`);