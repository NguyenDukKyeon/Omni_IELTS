import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const enabled = process.env.WEB_AI_BRIDGE_ENABLED === 'true';
const bridgeKey = process.env.WEB_AI_BRIDGE_API_KEY?.trim();
const appBaseUrl = (process.env.OMNI_CANARY_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

if (!enabled || !bridgeKey) {
  throw new Error('Private Web Bridge canary is not configured. Run npm run setup:web-bridge first.');
}

async function verifyArtifact(artifact) {
  const response = await fetch(`${appBaseUrl}/api/internal/ai/canary/text`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-omni-web-bridge-key': bridgeKey,
    },
    body: JSON.stringify({ artifact }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.status !== 'ok' || payload.lane !== 'web_bridge' || payload.itemCount < 2) {
    const category = typeof payload.category === 'string' ? payload.category : `http_${response.status}`;
    throw new Error(`Web Bridge canary failed for ${artifact}: ${category}`);
  }
  return { artifact, lane: payload.lane, itemCount: payload.itemCount };
}

const results = [];
for (const artifact of ['vocabulary', 'mock_section']) {
  results.push(await verifyArtifact(artifact));
}

console.log(JSON.stringify({ status: 'ok', results }));
