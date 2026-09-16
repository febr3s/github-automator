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

// Add this function to automate.js
async function updateFile(octokit, owner, repo, path, newContent, commitMessage) {
  let currentFileSha = undefined;

  try {
    const { data: existingFile } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });
    // If the response is an array, it's a directory, not a file.
    if (!Array.isArray(existingFile)) {
      currentFileSha = existingFile.sha;
    }
  } catch (error) {
    if (error.status !== 404) {
      throw error; // Rethrow if it's not a "file not found" error
    }
    // 404 means the file doesn't exist yet; we'll create it.
  }

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: commitMessage,
    content: Buffer.from(newContent, "utf8").toString("base64"),
    ...(currentFileSha && { sha: currentFileSha }), // Include SHA only for updates
  });

  console.log(`✅ Updated ${path}`);
}

// In your main() function, after the fork wait:
console.log("Updating config.yml...");
const newConfigContent = "version: 2\n# ... your new config data ...";
await updateFile(octokit, forkOwner, forkRepo, "config.yml", newConfigContent, "Update config.yml via API");
