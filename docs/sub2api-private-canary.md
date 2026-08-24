# Sub2API private canary

Sub2API is retained as an operator-only sidecar. It is disabled in Omni IELTS' public fallback chain and must not be presented to learners as an available provider.

Use only subscriptions and accounts owned by the operator and permitted by the upstream provider's terms. A ChatGPT Plus subscription is not an official OpenAI API entitlement; do not assume that connecting it through a third-party gateway is supported or suitable for a public product.

## Start the isolated stack

Set all `SUB2API_*` secrets in `.env`, then run:

```bash
docker compose --env-file .env -f compose.sub2api-canary.yml up -d
```

The dashboard is bound to `127.0.0.1:8082` by default. PostgreSQL and Redis have no host ports. Existing named volumes are reused and are not deleted by normal `up`/`down` commands.

Sub2API is deliberately not wired into `server.ts` yet. Enabling a future fallback requires a separate capability-gated change, private canary evidence, and a review of the relevant upstream terms.
