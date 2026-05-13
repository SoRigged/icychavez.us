# Liliana PC Health Check + Uptime Kuma + icychavez.us Update — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify Liliana_PC containers are healthy, deploy Uptime Kuma monitoring at `status.icychavez.us`, and update the icychavez.us dashboard with Books and Status cards.

**Architecture:** Three sequential tasks — read-only health check via SSH, Docker Compose deployment of Uptime Kuma with Cloudflare Tunnel ingress, then a one-file edit to the Astro dashboard followed by a git push to trigger Cloudflare Pages auto-deploy.

**Tech Stack:** Docker Compose, Cloudflare Tunnel (`cloudflared`), Cloudflare Pages, Astro 5, TypeScript

---

## File Map

| Action | File |
|---|---|
| Modify | `src/data/services.ts` — add Books + Status entries |
| Create (on Liliana_PC) | `C:\Users\Lilianaa\Projects\Selfhosting\uptime-kuma\docker-compose.yml` |
| Modify (on Liliana_PC) | `C:\Windows\System32\config\systemprofile\.cloudflared\config.yml` — add status.icychavez.us ingress |

---

## Task 1: Health Check

**Files:** None — read-only SSH inspection

- [ ] **Step 1: SSH into Liliana_PC**

```powershell
ssh Lilianaa@192.168.50.244
```

- [ ] **Step 2: Check all container states**

```powershell
docker ps --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"
```

Expected — all 9 of these containers present and showing `Up X` with `(healthy)` where applicable:

| Container | Stack |
|---|---|
| `pihole` | Pi-hole |
| `unbound` | Pi-hole |
| `plex` | Media |
| `gluetun` | Media |
| `sabnzbd` | Media |
| `qbittorrent` | Media |
| `port-sync` | Media |
| `calibre` | Books |
| `calibre-web` | Books |

- [ ] **Step 3: Investigate any unhealthy or missing containers**

If a container shows `Restarting`, `Exited`, or is missing entirely:

```powershell
docker logs <container-name> --tail 50
```

Fix before proceeding. Common causes: port conflict, volume path missing, dependency not healthy yet.

- [ ] **Step 4: Verify Cloudflare Tunnel is running**

```powershell
Get-Service cloudflared
```

Expected: `Status: Running`. If stopped:

```powershell
Start-Service cloudflared
```

- [ ] **Step 5: Spot-check tunnel endpoints**

From a browser or curl on BEAST, confirm these load:
- `https://cookbook.icychavez.us` — cookbook homepage
- `https://books.icychavez.us` — Calibre-Web login page
- `https://plex.icychavez.us` — Plex login

If any fail, check tunnel config: `type C:\Windows\System32\config\systemprofile\.cloudflared\config.yml`

---

## Task 2: Deploy Uptime Kuma

**Files:**
- Create (on Liliana_PC): `C:\Users\Lilianaa\Projects\Selfhosting\uptime-kuma\docker-compose.yml`
- Modify (on Liliana_PC): `C:\Windows\System32\config\systemprofile\.cloudflared\config.yml`

- [ ] **Step 1: Create the uptime-kuma directory on Liliana_PC**

```powershell
New-Item -ItemType Directory -Path "C:\Users\Lilianaa\Projects\Selfhosting\uptime-kuma" -Force
```

- [ ] **Step 2: Write the docker-compose.yml**

```powershell
Set-Content -Path "C:\Users\Lilianaa\Projects\Selfhosting\uptime-kuma\docker-compose.yml" -Encoding utf8 -Value @'
services:
  uptime-kuma:
    image: louislam/uptime-kuma:1
    container_name: uptime-kuma
    restart: unless-stopped
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data
'@
```

- [ ] **Step 3: Start the container**

```powershell
cd C:\Users\Lilianaa\Projects\Selfhosting\uptime-kuma
docker compose up -d
```

Expected output: `Container uptime-kuma  Started`

- [ ] **Step 4: Verify the container is running**

```powershell
docker ps --filter "name=uptime-kuma"
```

Expected: `uptime-kuma` showing `Up X seconds`.

- [ ] **Step 5: Confirm Uptime Kuma is accessible on LAN**

From BEAST browser: `http://192.168.50.244:3001`

Expected: Uptime Kuma setup/login page loads. If it doesn't load within 30 seconds, check logs:

```powershell
docker logs uptime-kuma --tail 30
```

- [ ] **Step 6: Add tunnel ingress rule for status.icychavez.us**

Read the current config first:

```powershell
type "C:\Windows\System32\config\systemprofile\.cloudflared\config.yml"
```

Add the new ingress entry **before** the catch-all `- service: http_status:404` line at the bottom:

```yaml
- hostname: status.icychavez.us
  service: http://localhost:3001
```

The ingress section should look like this after editing (existing entries preserved, new one added):

```yaml
ingress:
  - hostname: cookbook.icychavez.us
    service: http://localhost:3000
  - hostname: plex.icychavez.us
    service: http://localhost:32400
  - hostname: pihole.icychavez.us
    service: http://localhost:8080
  - hostname: downloads.icychavez.us
    service: http://localhost:8081
  - hostname: books.icychavez.us
    service: http://localhost:8083
  - hostname: calibre.icychavez.us
    service: http://localhost:8082
  - hostname: status.icychavez.us
    service: http://localhost:3001
  - service: http_status:404
```

> Note: verify exact existing entries match what's actually in the file — the above is based on known services but the file is the source of truth.

- [ ] **Step 7: Restart cloudflared to pick up the new ingress rule**

```powershell
Restart-Service cloudflared
Start-Sleep -Seconds 5
Get-Service cloudflared
```

Expected: `Status: Running`

- [ ] **Step 8: Add DNS CNAME for status.icychavez.us**

Go to Cloudflare Dashboard → icychavez.us → DNS → Add record:

| Field | Value |
|---|---|
| Type | CNAME |
| Name | status |
| Target | `<tunnel-uuid>.cfargotunnel.com` |
| Proxy | Proxied (orange cloud) |

Tunnel UUID: `7eb602b3-1cb2-4eb8-9291-fead158b345f`

So Target = `7eb602b3-1cb2-4eb8-9291-fead158b345f.cfargotunnel.com`

- [ ] **Step 9: Verify status.icychavez.us resolves**

Wait ~30 seconds for DNS to propagate, then open `https://status.icychavez.us` in a browser.

Expected: Uptime Kuma setup/login page loads over HTTPS.

- [ ] **Step 10: Complete Uptime Kuma initial setup**

On first load, Uptime Kuma prompts to create an admin account. Create one and save the credentials.

- [ ] **Step 11: Add all monitors via Uptime Kuma UI**

Navigate to Dashboard → Add New Monitor for each:

**HTTP(s) monitors** (type: HTTP(s), interval: 60s, retries: 1):

| Monitor Name | URL |
|---|---|
| Chavez Cookbook | `https://cookbook.icychavez.us` |
| Plex | `https://plex.icychavez.us` |
| Pi-hole | `https://pihole.icychavez.us` |
| Downloads | `https://downloads.icychavez.us` |
| Books | `https://books.icychavez.us` |
| Calibre noVNC | `https://calibre.icychavez.us` |
| SABnzbd | `http://192.168.50.244:8085` |

**TCP Port monitor** (type: TCP Port):

| Monitor Name | Hostname | Port |
|---|---|---|
| Gluetun VPN | `192.168.50.244` | `8081` |

- [ ] **Step 12: Create the public status page**

In Uptime Kuma: Status Pages → New Status Page

- **Name:** Icy Chavez Services
- **Slug:** `default` (makes it the root status page at `/status`)
- Add all monitors to the page
- Set to **Public** (no password)
- Save

Verify at `https://status.icychavez.us/status/default` — all monitors should appear.

- [ ] **Step 13: Commit the compose file to the Selfhosting repo**

```powershell
cd C:\Users\Lilianaa\Projects\Selfhosting
git add uptime-kuma/docker-compose.yml
git commit -m "feat: add uptime-kuma monitoring container"
```

---

## Task 3: Update icychavez.us Dashboard

**Files:**
- Modify: `src/data/services.ts`

- [ ] **Step 1: Add Books and Status entries to services.ts**

Open `src/data/services.ts` (local on BEAST at `C:\Users\papas\Projects\icychavez.us\src\data\services.ts`) and update the `services` array to:

```ts
export interface Service {
  name: string;
  description: string;
  url: string;
  icon: string;
  status: "live" | "coming-soon";
}

export const services: Service[] = [
  {
    name: "Chavez Cookbook",
    description: "Family recipes passed down through generations",
    url: "https://cookbook.icychavez.us",
    icon: "🍳",
    status: "live",
  },
  {
    name: "Plex",
    description: "Movies, shows, and media streaming",
    url: "https://plex.icychavez.us",
    icon: "🎬",
    status: "live",
  },
  {
    name: "Pi-hole",
    description: "Network-wide ad blocking",
    url: "https://pihole.icychavez.us",
    icon: "🛡️",
    status: "live",
  },
  {
    name: "Downloads",
    description: "Download client and automation",
    url: "https://downloads.icychavez.us",
    icon: "⬇️",
    status: "live",
  },
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
];
```

- [ ] **Step 2: Verify the build passes**

```powershell
cd C:\Users\papas\Projects\icychavez.us
npm run build
```

Expected: Build completes with no errors. Output in `dist/`.

- [ ] **Step 3: Commit and push**

```powershell
git add src/data/services.ts
git commit -m "feat: add Books and Status cards to dashboard"
git push
```

Expected: Cloudflare Pages picks up the push and deploys automatically (check Cloudflare Pages dashboard or wait ~1 min).

- [ ] **Step 4: Verify live at icychavez.us**

Open `https://icychavez.us` in a browser.

Expected: 6 cards in the grid — Chavez Cookbook, Plex, Pi-hole, Downloads, Books, Status — all with green dots.

---

## Self-Review Notes

- Task 1 has no commit — it's a read-only health check, nothing to commit
- Task 2 Step 6 notes that the tunnel config should be verified against the actual file before editing — ingress entries shown are based on known services but the file is authoritative
- Uptime Kuma monitor and status page setup (Steps 11-12) are manual UI steps — no automation, by design
- `services.ts` in Task 3 shows the complete file to avoid partial-update errors