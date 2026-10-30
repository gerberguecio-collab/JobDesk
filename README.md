# Job Desk

Standalone version of the Job Desk artifact: a single static `index.html`.

- Data is stored in the browser (`localStorage`). Use the backup export/import on the Profile page to move it between devices.
- AI helpers (Scout, Matcher, Coach) that need Claude fall back to copying the prompt so you can paste it into Claude.

## Deploy

Hosted on Vercel as a static site. Every push to `main` redeploys automatically.
