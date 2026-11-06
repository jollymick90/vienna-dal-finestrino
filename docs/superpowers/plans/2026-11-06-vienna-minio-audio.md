# Vienna MinIO audio implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Serve the 56 POI MP3s from a dedicated MinIO bucket while preserving offline playback and every Hidrospace object.

**Architecture:** Retain relative local paths and hashes in the source manifest for generation/compression. Resolve POI paths to the dedicated HTTPS storage URL at runtime; only that exact remote path is handled by the service worker. Validate local originals or remote bytes at build time and exclude POI media from deployment artifacts.

**Tech Stack:** Svelte 5/Vite, Node.js, MinIO S3, existing Caddy HTTPS endpoint.

**Spec:** Approved design in this conversation: dedicated `vienna-audio` bucket, MP3s, restricted publisher credentials, direct browser downloads, offline compatibility. User explicitly authorized autonomous execution.

## Global Constraints

- Never change/delete Hidrospace buckets, objects, policies, credentials, database, Docker services or proxy configuration.
- All storage mutations target only the new `vienna-audio` bucket or its dedicated publisher identity/policy.
- Publisher credentials stay in ignored files with mode 0600, never browser assets or tracked files.
- Preserve all pre-existing local changes; work on a new branch in place so the completed MP3 work remains available. Do not commit unrelated work.
- Preserve WAV masters and source MP3s locally; do not delete remote objects on publish.

## Review Focus

- Offline playback and seeking use remote cached bytes, including no-cors audio requests.
- Cache pruning preserves current audio from other routes and never touches unrelated origins.
- Malicious manifest paths and remote URLs outside the exact bucket are rejected.
- A source checkout without local MP3s still builds against verified remote hashes.
- Existing storage snapshots (key, size, ETag, policy, lifecycle) must compare identically before/after provisioning/upload.

### Task 1: Remote audio integration

**Files:** Create `src/lib/audio-storage.js`, `tests/audio-storage.test.js`; modify `src/lib/catalog.js`, `src/lib/route-offline.js`, `src/service-worker.js`, `scripts/build-sw.js`, `scripts/validate-assets.js`, `.gitignore`; add `.vercelignore`.

**Interfaces:** `audioUrl(localPath)` resolves only validated POI filenames; `isRemoteAudioUrl(url)` allowlists the exact storage prefix. Source manifest paths remain local.

- [x] Write and run failing tests for URL validation, remote offline cache/Range handling and cache pruning.
- [x] Implement URL mapping, worker allowlist and URL-aware cache pruning; keep hash checks intact.
- [x] Add verified remote fallback for missing local media and omit POI binaries from build/CLI upload.
- [x] Run relevant unit tests and full unit suite.

### Task 2: Provision and publish

**Files:** Add `scripts/publish-audio.js`, `tests/publish-audio.test.js`, `.env.storage.example`; update package commands. Keep local ignored `.env.storage` and VPS private publisher credentials.

**Interfaces:** Publisher consumes the source manifest and local MP3s, validates bytes and performs only scoped HEAD/PUT/GET operations; it never deletes.

- [x] Write and run failing tests for hash mismatch, path rejection and upload verification/idempotence.
- [x] Implement a scoped S3 publisher using Node crypto SigV4 and fetch, without additional production dependencies.
- [x] Snapshot all existing bucket object metadata, policies and lifecycle rules.
- [x] Create only the new bucket and publisher policy/user; public access permits GetObject only. Keep admin credentials on VPS.
- [x] Publish and verify all 56 MP3s, content types, hashes, cache headers and HTTP Range behavior.
- [x] Compare Hidrospace snapshots exactly before/after.

### Task 3: End-to-end validation and documentation

**Files:** Add a remote audio browser test and update README/storage report.

- [x] Verify real remote playback, download, offline playback, seeking and reload in Chromium.
- [x] Run check, full unit/browser suites and production build.
- [x] Build from a checkout simulation without local POI media, verifying remote fallback and no POI binaries in dist.
- [x] Document publish/rebuild workflow and measured storage size; independently review the final diff and address important findings.

## Progress

- Baseline: 52 unit tests pass. Existing work already generated and compressed all 56 POI audio files.
- Execution: native, in place on `feat/vienna-minio-audio`, preserving the dirty working tree. No commits of pre-existing changes.

- Verified: 61 unit tests, 11 Chromium browser tests, svelte-check zero errors/warnings; production build and clean-source build without local POI MP3s both pass. Artifact size 1,510,561 bytes.
- Independent review: no Critical/Important findings. Added the planned remote pruning regression covering other routes, stale files and unrelated origins; it passes.
- Ruling: production builds validate published remote bytes even when local MP3s exist, preventing deployment of an unpublished manifest. Builds require storage network access.
- Ruling: reuse pre-existing compressed MP3s and preserve all existing dirty-tree work; no commits, merges or Vercel deployment performed. The authorized storage publication is live.
- Provisioning: downloaded mc endpoint returned HTTP 410 before any bucket mutation. Reused the client binary from the existing stopped init container instead; temporary copy removed.
- Hidrospace before/after object metadata and bucket policy/lifecycle/versioning snapshots compare identically.
