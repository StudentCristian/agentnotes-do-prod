# Manual DO UI Steps

These steps stay manual by design. Do not automate domain purchase, DNS setup, or Spaces bucket setup in this rollout.

## Spaces Setup

1. Open Spaces in the DigitalOcean UI and create a bucket named `agentnotes-audio-prod` in region `nyc3`.
2. Set the bucket ACL according to your production policy. The app uses presigned uploads, so keep the bucket configuration aligned with that model.
3. Create a Spaces access key dedicated to this app with read/write access to `agentnotes-audio-prod`.
4. Save the resulting access key and secret key as `DO_SPACES_KEY` and `DO_SPACES_SECRET` for App Platform and GitHub Actions.
5. Open the bucket CORS settings and mirror the values from [spaces-cors.json](c:/Users/Pc/Desktop/agentnotes-do-prod-v1/agentnotes-do-prod/spaces-cors.json), replacing the placeholder origin with the real production domain.
6. Open the lifecycle settings and add a rule that deletes temporary audio objects after 1 day.
7. Confirm the production non-secret values stay fixed as:
	- `DO_SPACES_BUCKET=agentnotes-audio-prod`
	- `DO_SPACES_REGION=nyc3`
	- `DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com`

## Domain Setup

1. Buy the production domain in the DigitalOcean UI.
2. Open the purchased domain and add the DNS record that points to the App Platform default ingress returned by `doctl apps get <app-id> --format DefaultIngress --no-header`.
3. Wait for DNS propagation.
4. Enable SSL in the DigitalOcean UI once the domain resolves to the app.

## Required Secrets

Load the following values into GitHub Actions secrets and provide the same values to the local rollout scripts when needed:

- `DIGITALOCEAN_ACCESS_TOKEN`
- `DO_APP_ID`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `EDGE_STORE_ACCESS_KEY`
- `EDGE_STORE_SECRET_KEY`
- `GOOGLE_AI_API_KEY`
- `DATABASE_URL`
- `DO_SPACES_KEY`
- `DO_SPACES_SECRET`

Use these fixed non-secret values in production:

- `DO_SPACES_BUCKET=agentnotes-audio-prod`
- `DO_SPACES_REGION=nyc3`
- `DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com`

## Rollout Note

For now, only PostgreSQL and App Platform remain automated with `doctl`. Spaces bucket creation, CORS, lifecycle, and key setup are manual and should be completed in the DigitalOcean UI before running production audio flows.