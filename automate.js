// automate.js
import { getAuthenticatedOctokit } from './auth.js';

const ORIGINAL_OWNER = "morelrep";
const ORIGINAL_REPO = "morel-no-code-generator-dev";

// --- Helpers ---

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

async function patchFile(octokit, owner, repo, path, transformFn, commitMessage) {
  const { data: current } = await octokit.rest.repos.getContent({ owner, repo, path });
  if (Array.isArray(current)) throw new Error(`${path} is a directory, not a file`);

  const oldText = Buffer.from(current.content, "base64").toString("utf8");
  const newText = transformFn(oldText);
  if (newText === oldText) {
    console.log(`  ↪️ No change to ${path} (transform produced identical content).`);
    return;
  }

  await octokit.rest.repos.createOrUpdateFileContents({
    owner, repo, path, message: commitMessage,
    content: Buffer.from(newText, "utf8").toString("base64"),
    sha: current.sha,
  });
  console.log(`✅ Patched ${path}`);
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

// --- Small YAML-ish helper for the transform ---
function setYamlKey(text, key, value) {
  const re = new RegExp(`^${key}:.*$`, "m");
  if (re.test(text)) {
    return text.replace(re, `${key}: ${value}`);
  }
  // Key not present — append it on a new line.
  const withNewline = text.endsWith("\n") ? text : text + "\n";
  return `${withNewline}${key}: ${value}\n`;
}

// --- Main ---

async function main() {
  const octokit = await getAuthenticatedOctokit();
  const { forkOwner, forkRepo } = await getOrCreateFork(octokit);
  console.log(`Ready to work with ${forkOwner}/${forkRepo}`);

  // --- Repo-level Actions permission ---
  console.log("Enabling GitHub Actions at repo level...");
  await octokit.rest.actions.setGithubActionsPermissionsRepository({
    owner: forkOwner, repo: forkRepo, enabled: true,
  });
  console.log("✅ Repo-level Actions enabled.");

  // --- Per-workflow enablement (clears the "fork gate") ---
  await enableAllWorkflows(octokit, forkOwner, forkRepo);

  // --- Configure GitHub Pages to deploy via GitHub Actions ---
  console.log("Configuring GitHub Pages (source: GitHub Actions)...");
  try {
    await octokit.rest.repos.updateInformationAboutPagesSite({
      owner: forkOwner,
      repo: forkRepo,
      build_type: "workflow",
    });
    console.log("✅ GitHub Pages configured to deploy via GitHub Actions.");
  } catch (error) {
    if (error.status === 404) {
      console.log("Pages not yet enabled. Creating site with Actions source...");
      await octokit.rest.repos.createPagesSite({
        owner: forkOwner,
        repo: forkRepo,
        build_type: "workflow",
      });
      console.log("✅ GitHub Pages site created with Actions source.");
    } else {
      throw error;
    }
  }

  // --- Content edit (read-modify-write) ---
  console.log("Patching _config.yml...");
  const CONFIG_PATH = "_config.yml"; // verify this — see note below
  await patchFile(octokit, forkOwner, forkRepo, CONFIG_PATH,
    (text) => {
      // Example: set 'baseurl' to the fork's repo name (typical for Jekyll project sites).
      let out = setYamlKey(text, "BASE_PATH", `"/${forkRepo}"`);
      // Add more setYamlKey calls here as you learn which fields matter:
      // out = setYamlKey(out, "title", `"My Site"`);
      return out;
    },
    "Update _config.yml via API"
  );

  // CSV edit, when ready:
  // console.log("Patching data.csv...");
  // await updateFile(octokit, forkOwner, forkRepo, "data.csv",
  //   "id,name,value\n1,new_entry,100\n2,another,200", "Update data.csv via API");
}

main().catch(err => {
  console.error("\n❌ Error:", err.message);
  if (err.response) console.error("Response:", err.response.data);
  process.exit(1);
});