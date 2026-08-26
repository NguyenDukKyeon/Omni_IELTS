export interface LiveCanaryTarget {
  baseURL: string;
  port: number;
  startsLocalServer: boolean;
}

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number(value || fallback);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error(`Invalid live canary port: ${value}`);
  }
  return parsed;
}

export function resolveLiveCanaryTarget(
  env: Record<string, string | undefined>,
): LiveCanaryTarget {
  const configuredBaseURL = env.PLAYWRIGHT_LIVE_BASE_URL?.trim().replace(/\/$/, '');
  if (!configuredBaseURL) {
    const port = parsePort(env.PLAYWRIGHT_LIVE_PORT, 3_200);
    return {
      baseURL: `http://127.0.0.1:${port}`,
      port,
      startsLocalServer: true,
    };
  }

  const url = new URL(configuredBaseURL);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported live canary URL protocol: ${url.protocol}`);
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const startsLocalServer = hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '::1';
  const defaultPort = url.protocol === 'https:' ? 443 : 80;

  return {
    baseURL: configuredBaseURL,
    port: parsePort(url.port, defaultPort),
    startsLocalServer,
  };
}
