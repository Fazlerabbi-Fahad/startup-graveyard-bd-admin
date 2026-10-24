# bdgy-admin

The private admin portal for the startup graveyard: one person signs in, watches visitors, and writes long case studies about failed Bangladeshi startups. It talks to **bdgy-api** and never stores tokens in the browser. The session is the API's httpOnly cookie, and every request is sent with `credentials: "include"`.

Stack: React 18 + Vite (JavaScript), React Router 7, TanStack Query, react-hook-form + zod, Tailwind CSS v4, Recharts, `@uiw/react-md-editor`, dnd-kit. Fonts are self-hosted (Bricolage Grotesque for UI, JetBrains Mono for numbers and the Markdown editor).

---

## Run locally

Requirements: Node 20.19+ and a running bdgy-api (see `../bdgy-api/README.md`).

```bash
cd bdgy-admin
npm install
cp .env.example .env
npm run dev            # http://localhost:3002
```

The API must allow this origin. In **bdgy-api's** `.env`:

```
ADMIN_ORIGIN=http://localhost:3002
```

Sign in with the API's `ADMIN_EMAIL` and the password you hashed with `npm run hash-password` there.

### Environment variables

| Variable | Example | Notes |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:4000/api` | Base URL of bdgy-api **including `/api`**, no trailing slash |
| `VITE_WEB_URL` | `http://localhost:3000` | Public site (bdgy-web). Used for "View on site" links, which link to `/case-studies/<slug>`. If it's empty, those links are hidden. |

These values are compiled into the bundle at build time, so they are public. Never put secrets in `VITE_*` variables.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3002 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built `dist/` on port 3002 |

---

## What's inside

- **Login and session.** The app calls `GET /auth/me` on load. Any 401 from any request clears cached data and sends you to `/login`, then back to the page you were on after you sign in.
- **Dashboard.** Has a 7 / 28 / 90-day range switch, plus:
  - GA4 users, sessions and page views, a daily-users chart (with a table view) and the top pages, countries and traffic sources.
  - Published, draft and new-correction counts, and the top case studies by views.
  - If GA4 isn't configured on the API, a card explains how to connect it, and the MongoDB numbers still show.
- **Case Studies.** Search, a status filter and pagination, all kept in the URL. Each row can be edited, viewed on the site, published or unpublished, or deleted (the delete dialog asks you to type the name).
- **Editor.** Eleven steps that match the data model, with a step list showing completion and a publish-readiness checklist. Required items mirror the API's publish rules; recommended items are editorial nudges.
  - **Markdown steps** show a word count and have a live-preview toggle.
  - **Lists:** timeline and lessons can be dragged to reorder (mouse or keyboard: Space, then the arrows, then Space). Timeline has a "Sort by date" button.
  - **Saving:** "Save draft" and Ctrl/Cmd+S save to the API. "Preview" shows the case study roughly as readers will see it. "Publish" stays disabled until every required item is done. If the API reports missing fields, those steps are highlighted.
  - **Local backups:** unsaved changes are backed up to `localStorage` every 10 seconds and when you leave. Leaving with unsaved changes asks first. When you reopen the case study, you're offered the local copy to restore or discard. Backups hold content only, never credentials.
- **Corrections.** New, Resolved and All filters, mark resolved or reopen, a mailto link for the sender, and a link to edit the related case study.
- **Theme.** Light, dark or system (the default), saved in `localStorage`.

Taxonomies (sectors, cities, failure categories, outcomes) come from `GET /public/taxonomies`, so the API stays the source of truth. A built-in copy is used until that request answers.

---

## Deploying

The admin is a static single-page app: build it and serve `dist/`, with every path falling back to `index.html`.

> **The deployed URL must match `ADMIN_ORIGIN` in bdgy-api exactly**, e.g. `https://admin.example.com` with no trailing slash. Otherwise the browser blocks requests (CORS) and the API rejects writes from an unknown origin (403).
>
> Use **custom domains under one registrable domain** for the API and admin (e.g. `api.example.com` + `admin.example.com`). The login cookie is sent cross-origin. Safari, and Chrome when third-party cookies are blocked, refuse cookies between *different sites*, and `*.vercel.app`, `*.netlify.app` and `*.onrender.com` subdomains each count as different sites. On those default domains, login can work in one browser and fail in another.

### Vercel

1. *Add New → Project* and import the repo.
2. **Root Directory:** `bdgy-admin`. The framework is detected as **Vite**: build `npm run build`, output `dist`.
3. Under *Environment Variables*, add `VITE_API_URL` (e.g. `https://api.example.com/api`) and `VITE_WEB_URL`.
4. `vercel.json` (already included) rewrites every path to `index.html`, so deep links like `/case-studies/123/edit` work.
5. Deploy, then attach your domain (e.g. `admin.example.com`) under *Settings → Domains*.
6. Set `ADMIN_ORIGIN=https://admin.example.com` on the API and redeploy the API.

### Netlify

1. *Add new site → Import an existing project* and pick the repo.
2. **Base directory:** `bdgy-admin`. **Build command:** `npm run build`. **Publish directory:** `bdgy-admin/dist`.
3. Under *Site configuration → Environment variables*, add `VITE_API_URL` and `VITE_WEB_URL`.
4. `public/_redirects` (already included) handles SPA routing.
5. Deploy, attach the custom domain, then set `ADMIN_ORIGIN` on the API to that exact URL.

### After deploying

- Open the admin. You should be sent to `/login`. Sign in, then check that the dashboard loads.
- If login "works" but you land straight back on `/login`, the browser dropped the cookie: see the custom-domain note above.
- If every request fails with a CORS error in the console, `ADMIN_ORIGIN` doesn't exactly match the URL in the address bar.
- Keep the portal out of search engines. `index.html` already sends `noindex, nofollow`. You can also add basic auth or an IP allowlist in your host's settings, but the API's login is what actually protects the data.

---

## Project layout

```
src/
  main.jsx                 router, providers, lazy-loaded pages
  index.css                Tailwind v4 + design tokens (light/dark), editor theming
  auth/auth.jsx            session (/auth/me), login/logout, RequireAuth, global 401 handling
  lib/                     api client, queries, theme, formatting, taxonomies
  components/              layout/sidebar, buttons/badges, dialogs, toasts, skeletons, icons
  pages/
    Dashboard.jsx          analytics + archive numbers
    CaseStudiesList.jsx    table with search/filter/row actions
    Corrections.jsx        reader corrections inbox
    editor/
      CaseStudyEditor.jsx  shell: steps, readiness, save/publish, autosave, leave guard
      model.js             steps, form <-> API mapping, zod schema
      readiness.js         publish requirements (mirrors the API) + recommendations
      stepsBasics.jsx      a) Basics  b) At a Glance  c-e, h, j) Markdown steps
      stepsMore.jsx        f) Timeline  g) What Went Wrong  i) Lessons  k) Research & Sources
      fields.jsx           Markdown field, image upload, tag input, sortable list
      Preview.jsx          reader-style preview
```
