# Icy Navigator — Personal Dashboard & Service Hub

## Context

**Domain:** icychavez.us (Cloudflare-managed)
**Purpose:** Central dashboard linking to all self-hosted services and projects under one domain.
**Motivation:** Consolidate the Chavez cookbook and future self-hosted services (Plex, Pi-hole, arr stack) behind a clean, publicly accessible portal — no port forwarding, no exposed home IP.

**Machines:**
- **BEAST** (AMD Ryzen 9 9950X3D, Windows 11) — development only
- **Liliana_PC** (i9-10900K, Windows 11) — runs all services, always on

## Architecture

```
icychavez.us (Cloudflare Pages)
  └── Static Astro dashboard ("Icy Navigator")

cookbook.icychavez.us (Cloudflare Tunnel → Liliana_PC:3000)
  └── Next.js Chavez cookbook app

[future subdomains via same tunnel]
  plex.icychavez.us    → Liliana_PC:32400
  pihole.icychavez.us  → Liliana_PC:80 (with Cloudflare Access gate)
  downloads.icychavez.us → Liliana_PC:TBD
```

**How it connects:**
- Dashboard is a static site on Cloudflare's edge — always available, no server needed
- Services run on Liliana_PC, exposed via Cloudflare Tunnel (outbound connection, no ports opened on router)
- `cloudflared` on Liliana_PC maintains persistent tunnel; DNS CNAMEs created automatically
- One tunnel, many routes — future services just add lines to the tunnel config

## Tech Stack

| Component | Technology | Where |
|-----------|-----------|-------|
| Dashboard | Astro (static output) + Tailwind CSS | Cloudflare Pages |
| Hosting | Cloudflare Pages (free tier) | Cloudflare edge |
| Tunnel | `cloudflared` (Windows Service) | Liliana_PC |
| Cookbook | Next.js + SQLite (existing app) | Liliana_PC |
| Process manager | NSSM (Non-Sucking Service Manager) | Liliana_PC |

**Why Astro:** Static-first, ships zero JS by default, fast loads. No SSR needed for a link dashboard. Can add interactive islands later (e.g., health checks) without rewriting.

**Why not Next.js for dashboard:** Overkill. No database, no auth, no API routes needed.

**Why Cloudflare Tunnel:** Free, secure, no port forwarding. Pairs with the domain already on Cloudflare. Handles reconnection, runs as a Windows Service.

## Dashboard Design

### Layout
- **Header:** "Icy Navigator" — clean, minimal text
- **Body:** Centered responsive grid of service cards (1 col mobile, 2-3 col desktop)
- **Footer:** "Chavez" — minimal text
- **Style:** Dark background, subtle card borders, muted accent color. No animations, no hero. Just a clean grid.

### Service Cards

| Card | Subdomain | Initial Status |
|------|-----------|---------------|
| Chavez Cookbook | cookbook.icychavez.us | Live (after tunnel setup) |
| Plex | plex.icychavez.us | Coming Soon |
| Pi-hole | pihole.icychavez.us | Coming Soon |
| Downloads | downloads.icychavez.us | Coming Soon |

Each card shows:
- Icon or emoji
- Service name
- Short description
- Status indicator (green dot = online, grey badge = "Coming Soon")

### Pages
- `/` — Dashboard homepage with service grid
- `/status` — Health check page that pings each subdomain and shows green/red status dots

### Favicon
Simple favicon (snowflake or "IC" text) so the tab isn't blank.

## Files to Create (Dashboard)

```
icychavez.us/
├── astro.config.mjs        # Astro config with Tailwind
├── tailwind.config.mjs      # Tailwind config (dark theme)
├── package.json
├── tsconfig.json
├── public/
│   └── favicon.svg          # Simple favicon
├── src/
│   ├── layouts/
│   │   └── Layout.astro     # Base HTML shell
│   ├── pages/
│   │   ├── index.astro      # Dashboard homepage
│   │   └── status.astro     # Health check page
│   ├── components/
│   │   ├── ServiceCard.astro # Reusable card component
│   │   └── StatusDot.astro  # Online/offline indicator
│   └── data/
│       └── services.ts      # Service definitions (name, url, icon, status)
└── docs/
    └── superpowers/
        └── specs/
            └── this file
```

## Infrastructure on Liliana_PC

### Prerequisites to Install
1. **Node.js** (LTS) — for running the cookbook
2. **Git** — for cloning the cookbook repo
3. **`cloudflared`** — Cloudflare tunnel client
4. **NSSM** — wraps Node apps as Windows Services

### Cloudflare Tunnel Setup
1. Authenticate `cloudflared` with Cloudflare account
2. Create tunnel (e.g., named `liliana-tunnel`)
3. Configure routes in `config.yml`:
   ```yaml
   tunnel: <tunnel-id>
   credentials-file: <path-to-credentials.json>

   ingress:
     - hostname: cookbook.icychavez.us
       service: http://localhost:3000
     # Future services:
     # - hostname: plex.icychavez.us
     #   service: http://localhost:32400
     - service: http_status:404
   ```
4. Install as Windows Service: `cloudflared service install`
5. Use `--no-autoupdate` flag to prevent unexpected restarts from auto-updates

### Cookbook Setup
1. Clone cookbook repo to Liliana_PC
2. `npm install`
3. Create `data/` directory (not in git)
4. `npm run build` (production build)
5. Test locally: `npm run start` → verify on localhost:3000
6. Wrap with NSSM as Windows Service:
   - Service name: `chavez-cookbook`
   - Command: `node` with appropriate start script
   - Startup type: Automatic
   - Restart on failure: Yes

### Startup-on-Boot Summary

| Service | Method | Auto-start |
|---------|--------|-----------|
| Dashboard | Cloudflare Pages (cloud-hosted) | Always on |
| `cloudflared` tunnel | Windows Service (`cloudflared service install`) | Yes, at boot |
| Chavez Cookbook | NSSM Windows Service | Yes, at boot |
| Future services | NSSM or native service installers | Yes, at boot |

Everything runs as Windows Services — survives reboots, restarts on crash, no user login required.

## DNS Configuration

| Record | Type | Target |
|--------|------|--------|
| `icychavez.us` | CNAME/A | Cloudflare Pages (auto-configured) |
| `cookbook.icychavez.us` | CNAME | Tunnel (auto-created by `cloudflared`) |
| Future subdomains | CNAME | Same tunnel |

## Delivery Order (Approach A: Dashboard-First)

### Phase 1: Dashboard Live
1. Build Astro dashboard on BEAST
2. Push to GitHub (`icychavez.us` repo)
3. Connect repo to Cloudflare Pages
4. Configure custom domain `icychavez.us`
5. **Result:** icychavez.us is live with "Coming Soon" cards

### Phase 2: Tunnel & Cookbook
6. RDP into Liliana_PC
7. Install prerequisites (Node.js, Git, cloudflared, NSSM)
8. Clone cookbook repo, `npm install`, `npm run build`
9. Authenticate and create Cloudflare Tunnel
10. Configure tunnel routes (`cookbook.icychavez.us` → localhost:3000)
11. Install `cloudflared` as Windows Service (with `--no-autoupdate`)
12. Install cookbook as Windows Service via NSSM
13. **Result:** cookbook.icychavez.us is live

### Phase 3: Connect
14. Update dashboard — cookbook card status from "Coming Soon" to live link
15. Verify end-to-end: icychavez.us loads, cookbook link works, both survive reboot
16. **Result:** Full system operational

## Security Notes

- **No ports opened on router** — all traffic routes through Cloudflare Tunnel (outbound only)
- **Cloudflare Access (future):** When Pi-hole is added, gate `pihole.icychavez.us` behind Cloudflare Access (email OTP or similar) so admin panels aren't publicly exposed
- **Cookbook is read-only for visitors** — the SQLite database is local to Liliana_PC, mutations are only possible from the app itself
- **`cloudflared` pinned version** — `--no-autoupdate` prevents unexpected restarts

## Verification

1. `npm run dev` on BEAST — dashboard renders locally with all cards
2. `npm run build` — static build succeeds
3. Push to GitHub → Cloudflare Pages auto-deploys
4. Visit `icychavez.us` from phone (off wifi) — dashboard loads
5. Visit `cookbook.icychavez.us` from phone (off wifi) — cookbook loads
6. Reboot Liliana_PC → verify cookbook and tunnel come back automatically
7. `/status` page shows green dot for cookbook
