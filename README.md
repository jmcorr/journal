# FAU Owls Journal

A private, offline-first journal app themed for **Florida Atlantic University** (Boca Raton, FL). Built as a plain static site — **no backend, no API, no login, no API keys**. Every entry is stored locally in your browser via `localStorage`.

## Features

- Create, edit, and delete journal entries (title, date, mood, tags, free-text content)
- Search entries and filter by mood
- Export all entries to a JSON backup file, and import them back in
- FAU brand colors (`#002855` blue, `#BA0C2F` red) and an owl emblem

## Tech

Plain HTML, CSS, and vanilla JavaScript. No build step, no dependencies, no `node_modules`. Data never leaves the browser it was written in — there is nothing to deploy server-side and nothing to configure.

## Run locally

Open `index.html` directly in a browser, or serve the folder with any static server, e.g.:

```bash
npx serve .
```

## Deploy to Netlify

This repo is ready to deploy as-is.

**Option A — Netlify UI**
1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In Netlify, click **Add new site → Import an existing project** and pick this repository.
3. Build settings are already set via `netlify.toml` (publish directory `.`, no build command). Click **Deploy**.

**Option B — Netlify CLI**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

No environment variables, secrets, or API keys are required.

## Data & privacy

Entries are stored only in the browser's `localStorage` on the device you write them on. Clearing browser data will erase them — use the **Export** button regularly to download a JSON backup, and **Import** to restore it (on this device or another).
