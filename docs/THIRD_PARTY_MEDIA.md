# Third-party media components

Omni IELTS uses these pinned open-source components in the optional YouTube media pipeline:

- `yt-dlp` `2026.08.19`, distributed under The Unlicense. The application downloads the platform-specific release asset only after validating the SHA-256 listed in `server.ts`.
- `bgutil-ytdlp-pot-provider` `1.3.1`, distributed under GPL-3.0. The optional sidecar is pinned in `compose.media.yml`; its yt-dlp plugin archive is accepted only when its release SHA-256 matches `server.ts`.
- `yt-dlp-ejs`, fetched by yt-dlp through the explicit `ejs:github` remote component and executed with the absolute Node.js 22 runtime path.

The PO-token provider is hardening, not a guarantee that YouTube will accept every request. Omni IELTS does not ask learners for YouTube cookies. When automatic import is unavailable, the product offers learner-owned audio, VTT/SRT and pasted-transcript fallbacks.

Upstream notices:

- https://github.com/yt-dlp/yt-dlp
- https://github.com/yt-dlp/ejs
- https://github.com/Brainicism/bgutil-ytdlp-pot-provider
