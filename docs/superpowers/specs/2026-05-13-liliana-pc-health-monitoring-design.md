# Liliana PC Health Check + Uptime Kuma + icychavez.us Update — Design Spec

**Date:** 2026-05-13  
**Status:** Approved

---

## Overview

Three related tasks executed in sequence:

1. **Health check** — verify current container state on Liliana_PC
2. **Uptime Kuma** — deploy self-hosted monitoring dashboard at `status.icychavez.us`
3. **icychavez.us update** — add Books and Status cards to the dashboard

---

## Task 1 — Health Check

SSH into Liliana_PC (`ssh Lilianaa@192.168.50.244`) and check the running state of all containers outside the *arr stack.

**Containers to check:**

| Stack | Containers |
|---|---|
| Pi-hole | `pihole`, `unbound` |
| Media (partial) | `plex`, `gluetun`, `sabnzbd`, `qbittorrent`, `port-sync` |
| Books | `calibre`, `calibre-web` |

**Skip:** `prowlarr`, `sonarr`, `radarr`, `bazarr`, `nzbhydra2` (too much to verify in scope)

**How:** `docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"` — review for anything not in `Up X` state or missing health `(healthy)`.

**Success:** All 9 containers running and healthy. Note any that need attention.

---

## Task 2 — Uptime Kuma Deployment

### Container

- **Image:** `louislam/uptime-kuma:1`
- **Host port:** `3001`
- **Compose location:** `C:\Users\Lilianaa\Projects\Selfhosting\uptime-kuma\`
- **Data volume:** `./data:/app/data`
- **Restart policy:** `unless-stopped`
- **Network:** default bridge (no VPN, no special network needed)

### Cloudflare Tunnel

Add ingress rule to `C:\Windows\System32\config\systemprofile\.cloudflared\config.yml` on Liliana_PC:

```yaml
- hostname: status.icychavez.us
  service: http://localhost:3001
```

**No Cloudflare Access gate** — status page is intentionally public.

### DNS

Add CNAME `status` → tunnel UUID at Cloudflare DNS (same pattern as all other subdomains).

### Monitors to configure (inside Uptime Kuma UI after deployment)

| Monitor Name | Type | Target |
|---|---|---|
| Chavez Cookbook | HTTP(s) | `https://cookbook.icychavez.us` |
| Plex | HTTP(s) | `https://plex.icychavez.us` |
| Pi-hole | HTTP(s) | `https://pihole.icychavez.us` |
| Downloads | HTTP(s) | `https://downloads.icychavez.us` |
| Books (Calibre-Web) | HTTP(s) | `https://books.icychavez.us` |
| Calibre noVNC | HTTP(s) | `https://calibre.icychavez.us` |
| Gluetun VPN | TCP Port | `192.168.50.244:8081` |
| SABnzbd | HTTP(s) | `http://192.168.50.244:8085` |

Monitors are configured manually via Uptime Kuma UI after the container is live — not scripted.

### Status Page

Create one public status page in Uptime Kuma UI showing all monitors above. Name: "Icy Chavez Services".

---

## Task 3 — icychavez.us Dashboard Update

**File:** `src/data/services.ts`

Add two new entries to the `services` array:

```ts
{
  name: "Books",
  description: "Ebook library",
  url: "https://books.icychavez.us",
  icon: "📚",
  status: "live",
},
{
  name: "Status",
  description: "Service uptime and health",
  url: "https://status.icychavez.us",
  icon: "📡",
  status: "live",
},
```

Grid becomes 6 cards (3 rows × 2 cols on sm+). No layout changes needed — existing `grid-cols-2` handles it.

**Deploy:** `git commit + git push` → Cloudflare Pages auto-deploys.

---

## Execution Order

1. Health check (SSH, read-only, fast)
2. Deploy Uptime Kuma (compose up + tunnel config + DNS)
3. Configure monitors in Uptime Kuma UI (manual step, noted in plan)
4. Update icychavez.us + push

---

## Out of Scope

- *arr stack health (prowlarr, sonarr, radarr, bazarr, nzbhydra2)
- Cloudflare Access gate on status page (intentionally open)
- Automated alerting / notifications in Uptime Kuma (can be added later)