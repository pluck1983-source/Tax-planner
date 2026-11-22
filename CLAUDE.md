# Director Tax Planner

## Hosting and Google setup

- **Live:** https://pluck1983-source.github.io/Tax-planner/ (GitHub Pages,
  deploys from `main` only).
- **Google account:** the owner's personal Gmail account.
- **Google Cloud project:** **David's Apps** - project ID
  `empyrean-plexus-504512-b6`, number `285172097021`. Shared with Wardrobe to
  Wallet (cash4stuff): the two apps use the **same OAuth client**, so changing
  its redirect URIs, consent screen or test users affects both.
- **OAuth client:** `285172097021-…`, in the `VITE_GOOGLE_CLIENT_ID`
  repository variable (not committed).
- **Scope:** `drive.appdata` (a hidden folder only this project's client sees).
- **Data:** browser storage on each device, synced to `tax-planner-data.json`
  in the hidden app-data folder. Moving to another Cloud project means that
  folder is no longer visible - the first device to sign in under a new client
  uploads its copy.
- **Planned, not done:** move to its own **Tax Planner** project (ID
  `tax-planner-510419`, number `687936999132`, currently unused).

## Keep the app registry up to date

The owner keeps one summary of every app's hosting and Google setup in
`pluck1983-source/app-registry` (`APPS.md`). Whenever you change any of the
following in this repo, update **this file**, the README's Google section,
**and** `APPS.md` in that repo, in the same piece of work:

- the live web address / hosting
- the Google account, Google Cloud project, or OAuth client ID it signs in with
- the Google scopes it asks for
- where its data is stored (Drive folder, app-data folder, which account)

If `app-registry` isn't attached to the session, ask the owner to attach it
rather than skipping the update. Never write email addresses into these
files - the repos are public; describe accounts instead ("personal Gmail",
"Wardrobe to Wallet account").
