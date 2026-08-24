import type { AiTaskTier } from './aiTaskProfiles';

export type WebBridgeSessionStatus =
  | 'disabled'
  | 'login_required'
  | 'authenticated'
  | 'expired'
  | 'unavailable';

export type WebBridgePriority = 'prefer_deep' | 'disabled';

export interface BrowserCookieLike {
  name: string;
  value: string;
  domain: string;
  expires?: number;
}

const GEMINI_COOKIE_NAMES = new Set([
  'SAPISID',
  '__Secure-1PSID',
  '__Secure-1PSIDCC',
  '__Secure-1PSIDRTS',
  '__Secure-1PSIDTS',
  '__Secure-1PAPISID',
  '__Secure-3PSID',
  '__Secure-3PSIDCC',
  '__Secure-3PSIDRTS',
  '__Secure-3PSIDTS',
  '__Secure-3PAPISID',
  '__Host-1PLSID',
  '__Host-3PLSID',
  'SID',
  'SIDCC',
  'HSID',
  'SSID',
  'APISID',
  'NID',
]);

function isGoogleDomain(domain: string): boolean {
  const normalized = domain.trim().toLowerCase().replace(/^\./, '');
  return normalized === 'google.com'
    || normalized.endsWith('.google.com')
    || normalized === 'gemini.google.com';
}

function isUnexpired(cookie: BrowserCookieLike, nowSeconds: number): boolean {
  return !cookie.expires || cookie.expires < 0 || cookie.expires > nowSeconds;
}

export function selectGeminiSessionCookies(
  cookies: BrowserCookieLike[],
  nowSeconds = Date.now() / 1_000,
): { cookie: string; sapisid: string } {
  const selected = cookies.filter((cookie) =>
    GEMINI_COOKIE_NAMES.has(cookie.name)
    && isGoogleDomain(cookie.domain)
    && Boolean(cookie.value)
    && isUnexpired(cookie, nowSeconds));
  const sapisid = selected.find((cookie) => cookie.name === 'SAPISID')?.value;
  if (!sapisid) throw new Error('Gemini Pro login is missing SAPISID. Please sign in again.');
  if (!selected.some((cookie) => cookie.name === '__Secure-1PSID')) {
    throw new Error('Gemini Pro login is missing the secure session cookie. Please sign in again.');
  }
  return {
    cookie: selected.map(({ name, value }) => `${name}=${value}`).join('; '),
    sapisid,
  };
}

export function isGeminiAuthenticatedUi(input: {
  visibleActions: string[];
  ariaLabels: string[];
}): boolean {
  const normalize = (value: string) => value.trim().toLocaleLowerCase('vi');
  const actions = input.visibleActions.map(normalize);
  const labels = input.ariaLabels.map(normalize);
  const showsSignIn = actions.some((value) => value.includes('sign in') || value.includes('đăng nhập'));
  const showsAccount = labels.some((value) => value.includes('google account') || value.includes('tài khoản google'));
  return showsAccount && !showsSignIn;
}

export function getConfiguredWebBridgeSessionStatus(
  env: Record<string, string | undefined>,
  sessionFileExists = Boolean(env.WEB_AI_BRIDGE_COOKIE_HOST_PATH?.trim()),
): WebBridgeSessionStatus {
  if (env.WEB_AI_BRIDGE_ENABLED?.trim().toLowerCase() !== 'true') return 'disabled';
  if (!env.WEB_AI_BRIDGE_COOKIE_HOST_PATH?.trim() || !sessionFileExists) return 'login_required';
  return 'unavailable';
}

export function shouldPreferWebBridgeForTier(
  tier: AiTaskTier,
  input: {
    enabled: boolean;
    priority: string | undefined;
    sessionStatus: WebBridgeSessionStatus;
  },
): boolean {
  return input.enabled
    && input.priority === 'prefer_deep'
    && input.sessionStatus === 'authenticated'
    && tier === 'deep';
}

export async function resolveWebBridgeSessionStatusForTier(input: {
  tier: AiTaskTier;
  enabled: boolean;
  priority: string | undefined;
  sessionStatus: WebBridgeSessionStatus;
  probe: () => Promise<boolean>;
}): Promise<WebBridgeSessionStatus> {
  if (
    input.tier !== 'deep'
    || !input.enabled
    || input.priority !== 'prefer_deep'
    || input.sessionStatus !== 'unavailable'
  ) {
    return input.sessionStatus;
  }

  return await input.probe() ? 'authenticated' : 'unavailable';
}

export function createSerialExecutor() {
  let tail: Promise<unknown> = Promise.resolve();
  return function execute<T>(operation: () => Promise<T>): Promise<T> {
    const result = tail.then(operation, operation);
    tail = result.then(() => undefined, () => undefined);
    return result;
  };
}

export async function executeWithPreferredWebBridge<T>(input: {
  tier: AiTaskTier;
  enabled: boolean;
  priority: string | undefined;
  sessionStatus: WebBridgeSessionStatus;
  webBridge: () => Promise<T>;
  official: () => Promise<T>;
}): Promise<{
  value: T;
  lane: 'web_bridge' | 'official';
  webBridgeFailure?: unknown;
}> {
  if (!shouldPreferWebBridgeForTier(input.tier, input)) {
    return { value: await input.official(), lane: 'official' };
  }
  try {
    return { value: await input.webBridge(), lane: 'web_bridge' };
  } catch (webBridgeFailure) {
    return {
      value: await input.official(),
      lane: 'official',
      webBridgeFailure,
    };
  }
}
