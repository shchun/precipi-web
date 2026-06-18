# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`precipi-web` is a **static site** — a collection of self-contained interactive web demos (physics sims, creative-coding pieces, small utilities) served by **GitHub Pages** at **https://www.precipi.com/**. There is no framework, no bundler, and no build step for the site as a whole. Each demo is plain HTML/CSS/JS (several use p5.js loaded from a CDN); a demo is either a single `*.html` file at the root or its own subdirectory with an `index.html`.

## Deployment model

- **Hosting:** GitHub Pages, **legacy build** (`source: branch main, path /`), custom domain `www.precipi.com` (set by `CNAME`), HTTPS enforced. Remote `github.com:shchun/precipi-web.git`, default branch `main`. `gh` is authenticated as `shchun`.
- **Deploy = push to `main`.** Every push automatically triggers the GitHub-managed `pages build and deployment` run. There is **no `workflow_dispatch`** for it, so you cannot trigger it manually — you push and watch (`gh run list/watch -R shchun/precipi-web`). The only committed workflow, `.github/workflows/notify.yml`, just posts a Slack message after a successful Pages deploy; it does not perform the deploy.
- **Binaries are never committed.** APK and `.scr` files are git-ignored and hosted on **GitHub Releases** instead (tags `apks-v1` for APKs, `screensaver-v1` for the screensaver). The download cards link to those release assets.

## The demo grid is data-driven — `demos.js` is the source of truth

The home page (`index.html`) renders nothing hard-coded. It reads the `demos` array in [demos.js](demos.js) and builds one card per entry. **To add or change a demo card, edit `demos.js` — not the HTML.** Key points:

- Each entry: `icon`, `title`/`titleEn`, `desc`/`descEn`, `href` (where the card links), optional `path` (display label if it differs from `href`), optional `install` (URL for the "⬇ 설치" pill), optional `download`+`downloadLabel`/`downloadLabelEn` (release-asset URL for a download pill), and `tags` (array of filter ids).
- **Filters** are defined by the `filters` array in the same file. A card matches a filter if its `tags` include that filter's `id`; the special `installable` filter matches any card with an `install` field, and `all` matches everything. Use an existing filter id (`space`, `sim`, `art`, `tool`) — adding a new tag without adding a matching `filters` entry makes it unreachable.
- **i18n:** the site is bilingual (ko default / en). `index.html` holds the `I18N` map and `applyLang()`, which swaps card text using the `titleEn`/`descEn` fields and remembers the choice in `localStorage('lang')`. Always provide both language fields when adding a card.

## PWA demos served from subdirectories (deskclock, pomodoro)

`deskclock/` and `pomodoro/` are installable PWAs. They are authored to run at a site root but are served from a **subdirectory**, so two things must hold or they break:

- **Relative paths only.** `manifest.json` uses `"start_url": "."` / `"scope": "./"` (not `/`), and the service worker's cache list uses `./`, `index.html`, etc. (not `/index.html`). A leftover root-absolute path breaks manifest scope and SW caching.
- **Bump the service-worker cache version on every content change.** The SWs are cache-first (`CACHE_NAME = '…-vN'` in `pomodoro/sw.js` and `deskclock/service-worker.js`). If you change a demo's files but don't bump `vN`, returning visitors keep the stale version.

These demos are mirrored from external source projects (`c:\projects\pomodoro-app`, `c:\projects\deskclock`) — do not hand-edit the copies here as the canonical source; sync from the source app (see deployment agents below).

## Deployment agents

Prefer these subagents for the corresponding deploy flows rather than redoing the steps manually:

- **`web-deployer`** — commit current `main` changes, push, and wait for the Pages build to finish. Use for "deploy the site."
- **`deskclock-deployer`** — full Desk Clock pipeline: sync `app/index.html` from the deskclock repo into `deskclock/` (swapping the SW-register block back in), build & upload a debug APK to release `apks-v1`, refresh the sha256/size on the `apks/index.html` card, and push both repos.
- **`pomodoro-deployer`** — full Pomodoro pipeline (the source is now a Capacitor app, not web-only): commit the `pomodoro-app` repo, build & upload a debug APK (`pomodoro-debug.apk`) to release `apks-v1`, sync `pomodoro-app/www/` into `pomodoro/` (rewriting manifest/SW paths for the subdirectory + bumping the SW cache version), refresh the `apks/index.html` download card and the `demos.js` card, and push both repos.

## Conventions when editing here

- **Never stage user-local files** in commits — `.claude/settings.json`, `.claude/settings.local.json`, and `.claude/agent-memory/**` (the latter two are git-ignored). They show up as modified but are not part of any deploy.
- Commit messages in this repo are written in Korean with Conventional-Commit prefixes (`feat:`, `fix:`, `chore:`, `ci:`).
- The `archive/` folder holds retired demos still reachable via `archive/index.html`; they are intentionally kept out of the main `demos.js` grid.
- `elevator-sim/` is the one subproject with a `package.json` (`npm test` runs `node --test`); the rest of the repo has no test/lint tooling.

## Local preview

No dev server is configured. Serve the repo root over HTTP to test (e.g. `python -m http.server` from `c:\projects\precipi-web`) and open the demo — opening files via `file://` will break the service workers and the GitHub-API deploy-info fetch on the home page.
