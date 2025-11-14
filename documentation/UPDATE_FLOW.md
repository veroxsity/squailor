# Update Flow

This document explains how Squailor checks for updates, shows progress, handles stalls, and falls back to a manual download with integrity verification.

## Overview
- Provider: GitHub Releases
- Installer: NSIS (Windows), DMG/ZIP (macOS), AppImage/deb (Linux)
- Differential updates: Enabled by electron-updater when blockmaps are present

## Phases (logged in `startup.log`)
- phase:update-checking — auto-updater checking (non-blocking flow)
- phase:update-available:<version> — remote update detected
- phase:download-start — first download-progress received
- phase:download-end:<version> — update-downloaded event fired
- phase:update-not-available — no update detected
- phase:update-error:<message> — updater error
- phase:check-for-updates:ipc — user-triggered check from Settings → Updates
- phase:update-slow:<ms> — stalled download watchdog fired (renderer shows fallback banner)
- phase:install-trigger:ipc:restart-now|restart-later — install initiated via IPC
- phase:manual-download:start — fallback manual installer download began
- phase:manual-download:error:<message> — manual path error
- phase:manual-download:verify-failed — SHA-512 integrity mismatch
- phase:manual-download:complete — manual download finished (verified)
- phase:manual-install:spawned — manual installer process launched
- phase:manual-install:error:<message> — installer spawn problem

## UI Behavior
- Splash screen shows checking/available and a rich progress bar (%, MB, speed, ETA).
- Settings → Updates panel shows:
  - Current version and Latest available
  - "Auto-apply downloaded updates" toggle
  - Progress details (MB, speed, ETA) during download
  - Manual download button (fallback path)
- Stalled banner appears if no download progress for 20s, offering Retry / Manual / Dismiss.

## Manual Download (Fallback)
- Fetches `latest.yml` from latest GitHub release to obtain version, `path` (.exe), and `sha512`.
- Streams the installer to temp with progress events.
- Computes SHA-512 (base64) and verifies against `latest.yml`.
- On success, spawns the installer and exits the app.

## Integrity
- Auto-updater validates signatures; manual path performs SHA-512 equality per `latest.yml`.

## Notes
- Ensure Windows releases include `latest.yml` and `.blockmap` files for differential updates.
- If GitHub is slow in some regions, consider CDN mirroring (see TODO in project).
