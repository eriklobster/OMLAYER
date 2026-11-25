# Portable Minecraft survival server

A self-contained Docker Compose starter for Linux x86-64/ARM64 and Windows 11 with Docker Desktop (WSL2, Linux containers). No hosting subscription required. Paper preserves vanilla-style survival while allowing a small plugin set; it is not the official unmodified vanilla server.

## Start
1. Install Docker Engine + Compose on 64-bit Debian/Ubuntu, or Docker Desktop with WSL2 on Windows. On a 4 GB host prefer Linux; Windows with Docker is best with at least 8 GB RAM.
2. Open a terminal in this folder. Linux: `cp .env.example .env`. PowerShell: `Copy-Item .env.example .env`.
3. Read https://www.minecraft.net/en-us/eula and set EULA=TRUE only if accepted. Generate a unique long random RCON_PASSWORD; keep it private. Leave BIND_IP=127.0.0.1 for initial setup. 
4. Run `docker compose config --quiet`, then `docker compose up -d`, then `docker compose logs -f mc`. Wait for Done and confirm Geyser, Floodgate, LuckPerms and Chunky loaded without errors. Current upstream baseline: Paper 26.3 + Java 25; verify supported Geyser versions before first boot. Plugin downloads and container tags are floating; do not automatically update a live world.
5. Add an authenticated Java player: `docker compose exec mc rcon-cli whitelist add YOUR_JAVA_NAME`. Only trusted owner accounts should be granted operator privileges with `docker compose exec mc rcon-cli op YOUR_JAVA_NAME`.
6. Inspect generated `data/plugins/Geyser-Spigot/config.yml`: verify Floodgate authentication (some versions detect it automatically), port 19132, and remote auto configuration. Keep Floodgate private keys in data, not Git.
7. For Bedrock whitelist, use the Floodgate command documented at https://geysermc.org/wiki/floodgate/whitelist/ (check actual installed command via help). Verify an unlisted Java and an unlisted Bedrock account are both rejected. Do not expose network ports until these tests pass.

## Joining
Java uses TCP 25565, Bedrock uses UDP 19132 (TCP 19132 is also mapped for Geyser signaling where required). Local Java connects to localhost; after validation set BIND_IP to the host LAN IP and apply with `docker compose up -d`. Phones connect to the LAN IP. Xbox/PlayStation may not offer direct custom-server entry; use Geyser's console connection guidance, and test each device. No public forwarding or tunnel is enabled by default. For remote friends use a suitable private network or deliberately configured game-port forwarding; never forward RCON 25575. Home CGNAT can prevent direct inbound access.

## Login
Default: genuine Java account authentication and Bedrock Xbox/Microsoft authentication via Floodgate. No extra Java purchase is needed for authenticated Bedrock players. Password-based login for offline-mode Java clients is not enabled: this changes player UUIDs, introduces impersonation risks and requires an AuthMeReloaded + Floodgate compatibility/security test. For a private test copy only, install a compatible AuthMe release, follow its documentation, verify login enforcement, inventory/chat/commands before login, privileged-name protection, and Java/Bedrock access before considering offline mode. Never switch an existing live world between authentication modes casually.

## Hardware profiles
| Host | MC_MEMORY | Players | View / simulation |
|---|---|---|---|
| 4 GB Linux x86-64/ARM64 | 2304M | 6 | 6 / 4 |
| 8 GB Windows laptop (WSL2) | 3G | 10 | 8 / 5 |
| 8 GB native Linux | 4G | 12 | 8 / 5 |
These are initial limits, not benchmarked capacities. Use an SSD and wired Ethernet when possible. Lower distances if TPS falls below 20. Use Chunky to pregenerate a bounded area while nobody is playing: console commands `chunky radius 1000` and `chunky start`; monitor disk space, TPS and temperature. No CoreProtect auto-install until a compatible free release is verified for the selected version.

## Operations
- Status: `docker compose ps`
- Console: `docker compose exec mc rcon-cli`
- Backup now: `docker compose exec backups backup now`
- Backup logs: `docker compose logs backups`
- Stop safely: `docker compose stop backups mc`
- Restart: `docker compose up -d`
- Scheduled backups every six hours, local retention seven days / 28 archives. Check actual archives and test recovery before relying on them. Save copies to an external disk or private off-site storage; local backups alone do not survive drive failure.
- Migration/cold standby: stop the old host, take a final backup, copy the full data folder, backups, compose and private .env securely to the new host; keep the old host stopped until the new host is verified. Never run two writers on one world or live-sync active world files. Change BIND_IP for new host. Restore testing: extract a backup into a fresh separate directory; inspect archive contents first, use a different Compose project name and ports or keep original stopped, test world/player data, then promote only after approval.
- Upgrade: first back up and test a separate copy. Freeze working image/plugin versions or archive actual jars and manifests before accepting updates. Never downgrade an upgraded world.

## Acceptance checklist (not yet executed on hardware)
- Compose validates; both services healthy; four plugins loaded.
- Java and mobile Bedrock join, whitelisted only; verify Xbox/PS separately.
- Survival builds and inventories persist after graceful restart.
- Manual and scheduled backups exist; restore into a separate copy and verify.
- 6 concurrent players on 4 GB host with TPS around 20; adjust after measurement.
- No secrets in Git; RCON unreachable from LAN; only intentional game ports reachable.
- Cold migration preserves world and identity data.

References: https://docker-minecraft-server.readthedocs.io/ ; https://geysermc.org/wiki/geyser/setup/ ; https://geysermc.org/wiki/floodgate/setup/ ; https://github.com/itzg/docker-mc-backup ; https://docs.papermc.io/paper/getting-started/
