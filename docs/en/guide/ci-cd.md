# CI And Deploy

Purpose: describe the safe deployment boundary for `wg-studio` when using GitHub Actions or Gitea Actions.

## Deployment Boundary

Keep environment-specific runtime files on the server:

- `.env`
- `docker-compose.override.yml`
- `backups/`

Keep only templates in git:

- `.env.example`
- `docker-compose.override.example.yml`

The workflow should test the repository, then SSH into the deployment server and run the checked-in deploy script.

## Server Expectations

The deployment server should already have:

- a checked-out `wg-studio` repository
- a valid `.env`
- an optional `docker-compose.override.yml` for Traefik, external networks, or host-specific mounts
- Docker and Docker Compose available

The checked-in [`scripts/deploy.sh`](../../../scripts/deploy.sh) then performs:

1. `git fetch`
2. `git pull --ff-only`
3. `docker compose config`
4. `docker compose up -d --build`

## Required Secrets

Use the same secret names in either GitHub or Gitea:

- `DEPLOY_HOST`
- `DEPLOY_PORT`
- `DEPLOY_USER`
- `DEPLOY_PATH`
- `DEPLOY_SSH_KEY`
- `DEPLOY_KNOWN_HOSTS`

`DEPLOY_KNOWN_HOSTS` should contain the server host key line from `ssh-keyscan`.

## Workflow Shape

The checked-in workflows use this order:

1. check out the repo
2. run `./scripts/pytest-safe.sh -q`
3. install the SSH key and known-hosts entry
4. SSH into the server
5. run `./scripts/deploy.sh main`

## Notes

- this approach keeps production secrets off the CI runner except for the SSH material needed to reach the server
- runtime `.env` values and Traefik wiring remain server-local
- if the server has tracked local changes, `git pull --ff-only` will fail intentionally so the drift is visible
