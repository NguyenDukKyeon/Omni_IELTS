export interface ProviderApiKeyCandidate {
  alias: string;
  apiKey: string;
}

function aliasPrefix(baseName: string): string {
  return baseName
    .replace(/_API_KEY$/, '')
    .toLowerCase()
    .replace(/_/g, '-');
}

export function getProviderApiKeyPool(
  env: Record<string, string | undefined>,
  baseName: string,
  byok?: string,
  maxKeys = 10,
): ProviderApiKeyCandidate[] {
  const prefix = aliasPrefix(baseName);
  const learnerKey = byok?.trim();
  if (learnerKey) return [{ alias: `${prefix}-byok`, apiKey: learnerKey }];

  const seen = new Set<string>();
  const candidates: ProviderApiKeyCandidate[] = [];
  for (let index = 1; index <= maxKeys; index += 1) {
    const envName = index === 1 ? baseName : `${baseName}_${index}`;
    const apiKey = env[envName]?.trim();
    if (!apiKey || seen.has(apiKey)) continue;
    seen.add(apiKey);
    candidates.push({
      alias: index === 1 ? `${prefix}-primary` : `${prefix}-${index}`,
      apiKey,
    });
  }
  return candidates;
}
