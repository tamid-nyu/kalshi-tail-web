# Kalshi Tail Lab

Next.js research dashboard. All datasets, results, Kalshi access and strategy logic live in `tamid-quant-api`. This repository contains presentation only.

`npm install && npm run dev`. Set `NEXT_PUBLIC_API_URL` to the API origin. Server-only `LAB_API_TOKEN` will authorize write proxy routes; never use a `NEXT_PUBLIC_` token. `npm run build` validates production output.

All pages and API research reads are public. Browser writes require signing in at `/access` with the separate `LAB_UI_PASSWORD` server secret; the signed HttpOnly, Secure, SameSite=Strict cookie lasts eight hours. The API bearer token is never sent to a client. Session routes check same origin and rate-limit sign-in attempts per function instance. Configure both server secrets in Vercel, never in a `NEXT_PUBLIC_` variable.

`/docs` reads the live OpenAPI contract and provides endpoint discovery plus examples. `/uploads` can activate validated observations as shared forward history, or deactivate them while keeping the version. Ordinary uploaded datasets remain isolated backtest inputs until explicitly activated. Uploaded dataset reads are public.

Git-triggered Vercel deployments are disabled; after merging a green PR, deploy through the authenticated CLI under the TAMID NYU team: `npx vercel@latest deploy --prod --yes --scope team_nrjOnKmTNVWkAdf40l6k6hkK`. GitHub Actions runs the production build for each PR.
