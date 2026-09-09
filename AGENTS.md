## Imported Claude Cowork project instructions

Keep track of my progress from my google sheet and F45 workout emails

## GitHub workflow

- Never commit changes directly to `main`.
- Create a dedicated branch for each change.
- Commit and push every completed change, then open a GitHub pull request.
- Keep unrelated changes in separate pull requests.

## Sites publishing workflow

- For every Site change, validate it and show the local test Site before merging its pull request.
- Wait for the user's explicit approval after they review the test Site before merging or publishing.
- Treat a Site change as complete only after its pull request is merged into `main` and that exact merged commit is successfully deployed with the Sites publishing workflow.
- After merging, synchronize the local `main` branch, run the production build, push the exact merged source to the Site repository, package the validated build, save a Site version, and deploy it to the Site's existing audience.
- Wait for the deployment to succeed and report the live Site URL. Do not stop after the GitHub merge or assume GitHub automatically deploys Sites.
- Skip deployment only when the user explicitly asks to keep the change local, leave it unmerged, or not publish it.
