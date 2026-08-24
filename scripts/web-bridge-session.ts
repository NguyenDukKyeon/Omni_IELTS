import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { mkdir, open } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { isGeminiAuthenticatedUi, selectGeminiSessionCookies } from '../src/lib/webBridgeSession';

const CDP_HOST = '127.0.0.1';
const CDP_PORT = 9223;
const CDP_URL = `http://${CDP_HOST}:${CDP_PORT}`;

function localAppData(): string {
  return process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
}

export function getWebBridgeLocalPaths() {
  const root = join(localAppData(), 'OmniIELTS', 'gemini-web-pro');
  return {
    root,
    profile: join(root, 'chrome-profile'),
    session: join(root, 'session.json'),
  };
}

function upsert(lines: string[], name: string, value: string, preserveNonEmpty = false): boolean {
  const prefix = `${name}=`;
  const index = lines.findIndex((line) => line.startsWith(prefix));
  if (index < 0) {
    lines.push(`${prefix}${value}`);
    return true;
  }
  if (preserveNonEmpty && lines[index].slice(prefix.length).trim()) return false;
  const replacement = `${prefix}${value}`;
  if (lines[index] === replacement) return false;
  lines[index] = replacement;
  return true;
}

function configureEnv(sessionPath: string, envPath = resolve(process.cwd(), '.env')): void {
  if (!existsSync(envPath)) throw new Error('Không tìm thấy .env. Hãy tạo từ .env.example trước.');
  const original = readFileSync(envPath, 'utf8');
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  const lines = original.replace(/\r\n/g, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  const hasKey = lines.some((line) => /^WEB_AI_BRIDGE_API_KEY=\S+/.test(line));
  upsert(lines, 'WEB_AI_BRIDGE_ENABLED', 'true');
  upsert(lines, 'WEB_AI_BRIDGE_KIND', 'gemini-web2api');
  upsert(lines, 'WEB_AI_BRIDGE_BASE_URL', 'http://gemini-web2api:8081/v1');
  upsert(lines, 'WEB_AI_BRIDGE_API_KEY', hasKey ? '' : randomBytes(32).toString('hex'), true);
  upsert(lines, 'WEB_AI_BRIDGE_MODEL', 'gemini-3.1-pro');
  upsert(lines, 'WEB_AI_BRIDGE_PRIORITY', 'prefer_deep');
  upsert(lines, 'WEB_AI_BRIDGE_COOKIE_HOST_PATH', sessionPath.replace(/\\/g, '/'));
  writeFileSync(envPath, `${lines.join(newline)}${newline}`, { encoding: 'utf8', mode: 0o600 });
}

function findChrome(): string {
  const candidates = [
    process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ].filter((candidate): candidate is string => Boolean(candidate));
  const chrome = candidates.find(existsSync);
  if (!chrome) throw new Error('Không tìm thấy Google Chrome để mở profile Gemini Pro riêng.');
  return chrome;
}

async function isCdpReady(): Promise<boolean> {
  try {
    const response = await fetch(`${CDP_URL}/json/version`, { signal: AbortSignal.timeout(1_500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForCdp(timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isCdpReady()) return;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));
  }
  throw new Error('Chrome profile riêng đã mở nhưng CDP chưa sẵn sàng.');
}

async function restrictToCurrentUser(path: string): Promise<void> {
  if (process.platform !== 'win32') return;
  const identity = process.env.USERDOMAIN && process.env.USERNAME
    ? `${process.env.USERDOMAIN}\\${process.env.USERNAME}`
    : process.env.USERNAME;
  if (!identity) throw new Error('Không xác định được tài khoản Windows hiện tại để đặt ACL.');
  const result = spawnSync('icacls.exe', [path, '/inheritance:r', '/grant:r', `${identity}:(F)`], {
    windowsHide: true,
    stdio: 'ignore',
  });
  if (result.status !== 0) throw new Error('Không thể giới hạn ACL cho phiên Gemini Pro.');
}

export async function syncGeminiWebSession(): Promise<string> {
  if (!await isCdpReady()) throw new Error('Chrome Gemini Pro chưa mở. Chạy npm run setup:web-bridge:pro trước.');
  const targets = await (await fetch(`${CDP_URL}/json/list`, { signal: AbortSignal.timeout(3_000) })).json() as Array<{
    type?: string;
    url?: string;
    webSocketDebuggerUrl?: string;
  }>;
  const geminiPage = targets.find((target) => target.type === 'page'
    && target.url?.startsWith('https://gemini.google.com/')
    && target.webSocketDebuggerUrl);
  if (!geminiPage?.webSocketDebuggerUrl) throw new Error('Không tìm thấy tab Gemini trong Chrome profile riêng.');
  const ui = await sendCdpCommand(geminiPage.webSocketDebuggerUrl, 'Runtime.evaluate', {
    expression: `(() => {
      const visible = (element) => Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
      const elements = [...document.querySelectorAll('a,button,[role="button"]')].filter(visible);
      return {
        visibleActions: elements.map((element) => (element.textContent || '').trim()).filter(Boolean),
        ariaLabels: [...document.querySelectorAll('[aria-label]')].filter(visible)
          .map((element) => element.getAttribute('aria-label') || '').filter(Boolean),
      };
    })()`,
    returnByValue: true,
  }) as { result?: { value?: { visibleActions?: string[]; ariaLabels?: string[] } } };
  const uiState = ui.result?.value;
  if (!isGeminiAuthenticatedUi({
    visibleActions: uiState?.visibleActions || [],
    ariaLabels: uiState?.ariaLabels || [],
  })) {
    throw new Error('login_required: Gemini vẫn đang hiện nút Sign in trong profile riêng.');
  }
  const versionResponse = await fetch(`${CDP_URL}/json/version`, { signal: AbortSignal.timeout(3_000) });
  const version = await versionResponse.json() as { webSocketDebuggerUrl?: string };
  if (!version.webSocketDebuggerUrl) throw new Error('Chrome CDP không cung cấp browser websocket.');
  const cookieResponse = await sendCdpCommand(version.webSocketDebuggerUrl, 'Storage.getCookies') as {
    cookies?: Array<{ name: string; value: string; domain: string; expires?: number }>;
  };
  const cookies = cookieResponse.cookies || [];
  {
    const session = selectGeminiSessionCookies(cookies);
    const { root, session: sessionPath } = getWebBridgeLocalPaths();
    await mkdir(root, { recursive: true, mode: 0o700 });
    const temporaryPath = `${sessionPath}.${process.pid}.tmp`;
    const handle = await open(temporaryPath, 'w', 0o600);
    try {
      await handle.writeFile(`${JSON.stringify(session)}\n`, 'utf8');
    } finally {
      await handle.close();
    }
    renameSync(temporaryPath, sessionPath);
    await restrictToCurrentUser(root);
    await restrictToCurrentUser(sessionPath);
    configureEnv(sessionPath);
    return sessionPath;
  }
}

async function sendCdpCommand(
  webSocketUrl: string,
  method: string,
  params: Record<string, unknown> = {},
): Promise<unknown> {
  return new Promise((resolveResult, rejectResult) => {
    const socket = new WebSocket(webSocketUrl);
    const timeout = setTimeout(() => {
      socket.close();
      rejectResult(new Error('Hết thời gian đọc phiên Gemini Pro qua CDP.'));
    }, 5_000);
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ id: 1, method, params }));
    });
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id !== 1) return;
      clearTimeout(timeout);
      socket.close();
      if (message.error) rejectResult(new Error('Chrome từ chối đọc phiên Gemini Pro qua CDP.'));
      else resolveResult(message.result || {});
    });
    socket.addEventListener('error', () => {
      clearTimeout(timeout);
      rejectResult(new Error('Không thể kết nối Chrome CDP để đồng bộ phiên Gemini Pro.'));
    });
  });
}

async function setup(): Promise<void> {
  const paths = getWebBridgeLocalPaths();
  await mkdir(paths.profile, { recursive: true, mode: 0o700 });
  await restrictToCurrentUser(paths.root);
  await restrictToCurrentUser(paths.profile);
  configureEnv(paths.session);
  if (!await isCdpReady()) {
    const chrome = findChrome();
    const child = spawn(chrome, [
      `--remote-debugging-address=${CDP_HOST}`,
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${paths.profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      'https://gemini.google.com/app',
    ], { detached: true, stdio: 'ignore', windowsHide: false });
    child.unref();
    await waitForCdp();
  }
  console.log('Đã mở Chrome profile Gemini Pro riêng. Hãy đăng nhập thủ công, rồi chạy npm run sync:web-bridge:session.');
}

async function sync(): Promise<void> {
  await syncGeminiWebSession();
  console.log('Đã đồng bộ phiên Gemini Pro vào kho local được bảo vệ; không in cookie ra màn hình.');
}

const command = process.argv[2];
if (command === 'setup') await setup();
else if (command === 'sync') await sync();
else throw new Error('Lệnh hợp lệ: setup hoặc sync.');
