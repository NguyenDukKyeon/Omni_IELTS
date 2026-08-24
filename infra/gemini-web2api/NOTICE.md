# Gemini Web bridge dependency

This local-only bridge uses [`HanaokaYuzu/Gemini-API`](https://github.com/HanaokaYuzu/Gemini-API), pinned to commit `955746dad14dae37c18bd766f34c8cd397ad50d4`.

The upstream project is licensed under **AGPL-3.0**. Its complete source is copied into the bridge image and its license is available at `/licenses/HanaokaYuzu-Gemini-API-AGPL-3.0.txt`.

Omni IELTS disables upstream request logging, accepts only an authenticated cookie file mounted read-only, uses temporary chats, and limits this integration to local development.
