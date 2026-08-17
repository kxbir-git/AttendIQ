# Deploying to Vercel

This app is a TanStack Start (React 19 + Vite) full-stack app with SSR. It builds
through Nitro using the `vercel` preset, which emits the Vercel Build Output API
(v3) into `.vercel/output`.

## One-time setup

1. Push this repository to GitHub/GitLab/Bitbucket.
2. In Vercel, **Add New → Project** and import the repository.
3. Leave the framework preset as **Other** — `vercel.json` already configures:
   - Install: `npm install`
   - Build: `npm run build:vercel` (`NITRO_PRESET=vercel vite build`)
   - Output directory: `.vercel/output`
4. Deploy.

## CLI deploy

```bash
npm i -g vercel
vercel link
vercel --prod
```

## Local production build

```bash
npm run build:vercel   # produces .vercel/output
npm run preview
```

## Environment variables

Add any variables in **Vercel → Project → Settings → Environment Variables**.

- Server-only values are read inside server function handlers via `process.env.X`.
- Browser-exposed values must be prefixed `VITE_` and read via `import.meta.env.VITE_X`.

## Node version

Vercel defaults to a current LTS Node runtime; Node 20+ is required. Set it in
**Settings → General → Node.js Version** if you need to pin it.

## Custom domain

**Settings → Domains → Add**, then point your DNS at the records Vercel shows.
