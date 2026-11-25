# GitHub Automator

GitHub Automator is a small Node.js script that uses GitHub's device OAuth flow to authenticate with Octokit, fork a repository, and update a file in the fork through the GitHub API.

The current automation:

1. Authenticates the GitHub account.
2. Forks `RivoLink/leaf`.
3. Waits five seconds for the fork to be provisioned.
4. Creates or updates `config.yml` in the fork.

## Requirements

- Node.js 18 or newer
- npm
- A GitHub account
- A GitHub OAuth application with **device flow** enabled

## 1. Create a GitHub OAuth application

1. Open **GitHub → Settings → Developer settings → OAuth Apps**.
2. Select **New OAuth App**.
3. Fill in the application details and homepage URL.
4. Enable OAuth device flow for the application.
5. Copy the **Client ID**.

The callback URL is not used by this script because authentication uses GitHub's OAuth device flow.

## 2. Install the project

```bash
git clone https://github.com/febr3s/github-automator.git
cd github-automator
npm install
```

## 3. Configure authentication

Create a local `.env` file:

```bash
cp env.example .env
```

Set the OAuth application's client ID:

```dotenv
GITHUB_CLIENT_ID=your_github_oauth_client_id
```

Keep `.env` private. It is included in `.gitignore` and should not be committed to Git.

## 4. Customize the automation

Open `automate.js` and change the source repository:

```javascript
const ORIGINAL_OWNER = "RivoLink";
const ORIGINAL_REPO = "leaf";
```

You can also change the file and content written to the fork:

```javascript
const newConfigContent = "version: 2\n# ... your new config data ...";

await updateFile(
  octokit,
  forkOwner,
  forkRepo,
  "config.yml",
  newConfigContent,
  "Update config.yml via API"
);
```

`updateFile()` creates the file when it does not exist or updates it using the file's current SHA when it does exist.

## 5. Run the automation

```bash
node automate.js
```

The script prints a verification URL and a one-time code. Open the URL in a browser, enter the code, and approve the requested permissions.

After authentication, the script forks the configured repository. It then creates or updates `config.yml` in the newly forked repository.

Example output:

```text
Requesting device code from GitHub...

--- ACTION REQUIRED ---
1. Open this URL in your browser: https://github.com/login/device
2. Enter this code: ABCD-EFGH
-----------------------

✅ Authentication successful!
Forking RivoLink/leaf...
✅ Fork created: your-user/leaf
```

## Verify authentication

To test the OAuth setup without forking or modifying a repository:

```bash
node test-auth.js
```

A successful test prints the authenticated GitHub username.

To check that the JavaScript dependencies load:

```bash
node test.js
```

## Requested permissions

The script requests these OAuth scopes:

- `public_repo` — fork and modify public repositories
- `workflow` — manage workflow files

Private repository access and organization restrictions depend on the OAuth application's permissions and your GitHub account settings.

## Project files

- `auth.js` — loads `.env` and creates an authenticated Octokit instance using GitHub device OAuth.
- `automate.js` — forks the configured repository and updates `config.yml` in the fork.
- `test-auth.js` — verifies authentication and prints the logged-in username.
- `test.js` — checks that Octokit and OAuth device authentication imports work.
- `env.example` — example environment configuration.

## Troubleshooting

### `GITHUB_CLIENT_ID is not set`

Make sure `.env` exists in the repository root and contains:

```dotenv
GITHUB_CLIENT_ID=your_github_ooauth_client_id
```

### Device verification expires

Run `node automate.js` again and complete the browser verification promptly.

### Repository fork already exists

Creating a fork for a repository that has already been forked may return the existing fork or require choosing a fork destination.

### Fork is not ready immediately

Although the script waits five seconds, larger or newly created repositories may take longer to become available through the API. Increase the delay or add a readiness check if necessary.

### Permission denied when updating a file

Confirm that:

- the OAuth device flow approval granted the required scopes;
- you can write to the fork;
- organization policies allow the OAuth application;
- the target fork is not restricted by branch protections or repository rules.
