# FAU Owls Journal

A journal app themed for **Florida Atlantic University** (Boca Raton, FL), with private per-user accounts.

## Features

- Email + password accounts (Supabase Auth) — everyone's entries are private to their own account
- Create, edit, and delete journal entries (title, date, mood, tags, free-text content)
- Search entries and filter by mood
- Export all entries to a JSON backup file, and import them back in
- One-time offer to import any older entries saved in the browser from a previous local-only version
- FAU brand colors (`#002855` blue, `#BA0C2F` red) and an owl emblem

## Tech

Plain HTML, CSS, and vanilla JavaScript — no build step, no framework, no bundler. Auth and data storage run on [Supabase](https://supabase.com) (Postgres + Auth), loaded in the browser via the `@supabase/supabase-js` CDN script. There is no custom backend server; the browser talks to Supabase directly, and Postgres Row Level Security (RLS) makes sure each account can only ever read or write its own entries.

### Backend (Supabase)

- Project: `jmcorr's Project` (`pphgpiiywzjacmebkqmd`)
- Table: `journal_entries` (`id`, `user_id`, `title`, `content`, `entry_date`, `mood`, `tags`, `created_at`, `updated_at`)
- RLS policies restrict every select/insert/update/delete to rows where `user_id = auth.uid()`
- `config.js` holds the project URL and the **publishable/anon key** — this key is meant to be public and is safe to ship in client-side code; it only grants what the RLS policies allow

By default, Supabase requires users to confirm their email after signing up before they can log in. If you want frictionless signup for testing, you can turn that off in the Supabase dashboard under **Authentication → Providers → Email → Confirm email**.

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

No environment variables or secrets are required — `config.js` already contains the public Supabase project URL and publishable key.

## Data & privacy

Entries are stored in a Supabase Postgres database, scoped to each account by Row Level Security. Only the signed-in owner of an entry can read, edit, or delete it. Use the **Export** button to download your own entries as a JSON backup at any time.
