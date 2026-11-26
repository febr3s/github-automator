// automate.js
import { getAuthenticatedOctokit } from './auth.js';

const ORIGINAL_OWNER = "morelrep";
const ORIGINAL_REPO = "morel-no-code-generator-dev";

async function updateFile(octokit, owner, repo, path, newContent, commitMessage) {
  let currentFileSha = undefined;
  try {
    const { data: existingFile } = await octokit.rest.repos.getContent({
      owner, repo, path,
    });
    if (!Array.isArray(existingFile)) currentFileSha = existingFile.sha;
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  await octokit.rest.repos.createOrUpdateFileContents({
    owner, repo, path, message: commitMessage,
    content: Buffer.from(newContent, "utf8").toString("base64"),
    ...(currentFileSha && { sha: currentFileSha }),
  });
  console.log(`✅ Updated ${path}`);
}

async function getOrCreateFork(octokit) {
  console.log(`Checking for existing fork of ${ORIGINAL_OWNER}/${ORIGINAL_REPO}...`);
  const { data: me } = await octokit.rest.users.getAuthenticated();

  try {
    const { data: existing } = await octokit.rest.repos.get({
      owner: me.login, repo: ORIGINAL_REPO,
    });
    console.log(`✅ Found existing fork: ${existing.full_name}`);
    return { forkOwner: existing.owner.login, forkRepo: existing.name };
  } catch (error) {
    if (error.status !== 404) throw error;
  }

  console.log(`No existing fork found. Creating a new one...`);
  const { data: fork } = await octokit.rest.repos.createFork({
    owner: ORIGINAL_OWNER, repo: ORIGINAL_REPO,
  });
  console.log(`✅ New fork created: ${fork.full_name}`);
  console.log("Waiting 5 seconds for the fork to be fully provisioned...");
  await new Promise(r => setTimeout(r, 5000));
  return { forkOwner: fork.owner.login, forkRepo: fork.name };
}

async function enableAllWorkflows(octokit, owner, repo) {
  console.log("Enabling individual workflows on the fork...");
  const { data: workflowList } = await octokit.rest.actions.listRepoWorkflows({ owner, repo });

  let enabledCount = 0;
  for (const wf of workflowList.workflows) {
    if (wf.state === "disabled_fork" || wf.state === "disabled_manually") {
      await octokit.rest.actions.enableWorkflow({
        owner, repo, workflow_id: wf.id,
      });
      console.log(`  ✅ Enabled: ${wf.name} (${wf.path})`);
      enabledCount++;
    } else {
      console.log(`  ↪️ Skipped (${wf.state}): ${wf.name}`);
    }
  }
  console.log(enabledCount > 0
    ? `✅ Enabled ${enabledCount} workflow(s).`
    : "  No disabled workflows found.");
}

async function main() {
  const octokit = await getAuthenticatedOctokit();
  const { forkOwner, forkRepo } = await getOrCreateFork(octokit);
  console.log(`Ready to work with ${forkOwner}/${forkRepo}`);

  // --- File edits ---
  console.log("Updating config.yml...");
  const newConfigContent = "version: 2\n# ... your new config data ...";
  await updateFile(octokit, forkOwner, forkRepo, "config.yml",
    newConfigContent, "Update config.yml via API");

  // Uncomment and set the real CSV path when ready:
  // console.log("Updating data.csv...");
  // await updateFile(octokit, forkOwner, forkRepo, "data.csv",
  //   "id,name,value\n1,new_entry,100\n2,another,200", "Update data.csv via API");

  // --- Repo-level Actions permission ---
  console.log("Enabling GitHub Actions at repo level...");
  await octokit.rest.actions.setGithubActionsPermissionsRepository({
    owner: forkOwner, repo: forkRepo, enabled: true,
  });
  console.log("✅ Repo-level Actions enabled.");

  // --- Per-workflow enablement (clears the "fork gate") ---
  await enableAllWorkflows(octokit, forkOwner, forkRepo);

  // --- Pages (uncomment once you confirm the default branch) ---
  // console.log("Enabling GitHub Pages...");
  // await octokit.rest.repos.createPagesSite({
  //   owner: forkOwner, repo: forkRepo,
  //   source: { branch: "main", path: "/" },
  // });
  // console.log("✅ GitHub Pages enabled.");
}

main().catch(err => {
  console.error("\n❌ Error:", err.message);
  if (err.response) console.error("Response:", err.response.data);
  process.exit(1);
});