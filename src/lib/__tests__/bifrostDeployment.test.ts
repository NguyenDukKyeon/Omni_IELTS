import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('Bifrost deployment configuration', () => {
  it('keeps all credentials as environment references and disables content persistence', () => {
    const configPath = resolve(root, 'infra/bifrost/config.json');
    const raw = readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw);

    expect(config.config_store).toEqual({
      enabled: true,
      type: 'sqlite',
      config: { path: '/tmp/bifrost-config.db' },
    });
    expect(config.logs_store).toEqual({ enabled: false });
    expect(config.client).toMatchObject({
      enforce_auth_on_inference: true,
      enable_logging: false,
      disable_content_logging: true,
      retain_content_in_object_storage: false,
      allow_per_request_content_storage_override: false,
      allow_per_request_raw_override: true,
      allow_direct_keys: false,
    });
    expect(config.governance.virtual_keys[0].value).toBe('env.BIFROST_VIRTUAL_KEY');

    const providerKeys = Object.values(config.providers)
      .flatMap((provider: any) => provider.keys || []);
    expect(providerKeys.map((key: any) => key.value)).toEqual(expect.arrayContaining([
      'env.GEMINI_API_KEY',
      'env.GEMINI_API_KEY_2',
      'env.GEMINI_API_KEY_3',
      'env.GEMINI_API_KEY_4',
      'env.GROQ_API_KEY',
      'env.GROQ_API_KEY_2',
      'env.GROQ_API_KEY_3',
      'env.NVIDIA_NIM_API_KEY',
      'env.NVIDIA_NIM_API_KEY_2',
      'env.NVIDIA_NIM_API_KEY_3',
      'env.OPENROUTER_API_KEY',
      'env.OPENROUTER_API_KEY_2',
      'env.OPENROUTER_API_KEY_3',
    ]));
    expect(providerKeys.every((key: any) => String(key.value).startsWith('env.'))).toBe(true);
    expect(raw).not.toMatch(/(?:AIza|AQ\.|sk-or-v1-|nvapi-|kira_)[A-Za-z0-9_-]+/);
  });

  it('allows only approved zero-cost models and retries across provider keys', () => {
    const config = JSON.parse(readFileSync(resolve(root, 'infra/bifrost/config.json'), 'utf8'));

    expect(config.providers.gemini.keys).toHaveLength(4);
    expect(config.providers.groq.keys).toHaveLength(3);
    expect(config.providers.nvidia_nim.keys).toHaveLength(3);
    expect(config.providers.openrouter.keys).toHaveLength(3);
    expect(config.providers.gemini.network_config.max_retries).toBeGreaterThanOrEqual(3);
    expect(config.providers.groq.keys[0].models).toEqual(['groq/compound-mini', 'groq/compound', 'openai/gpt-oss-120b']);
    expect(config.providers.kira).toBeUndefined();
    expect(config.providers.nvidia_nim.keys[0].models).toEqual(['meta/llama-3.3-70b-instruct']);
    expect(config.providers.openrouter.keys[0].models).toEqual(['openrouter/free']);
    const vkProviders = Object.fromEntries(
      config.governance.virtual_keys[0].provider_configs
        .map((providerConfig: any) => [providerConfig.provider, providerConfig.allowed_models]),
    );
    expect(vkProviders.groq).toEqual(['groq/compound-mini', 'groq/compound', 'openai/gpt-oss-120b']);
    expect(vkProviders.kira).toBeUndefined();
    expect(vkProviders.openrouter).toEqual(['openrouter/free']);
    expect(config.providers.nvidia_nim.custom_provider_config).toMatchObject({
      base_provider_type: 'openai',
      allowed_requests: {
        chat_completion: true,
        chat_completion_stream: false,
      },
    });
    expect(config.governance.virtual_keys[0].provider_configs)
      .toSatisfy((providerConfigs: Array<{ key_ids?: string[] }>) =>
        providerConfigs.every((providerConfig) => providerConfig.key_ids?.length === 1
          && providerConfig.key_ids[0] === '*'));
  });

  it('pins an internal-only image and waits for a healthy gateway', () => {
    const compose = readFileSync(resolve(root, 'compose.media.yml'), 'utf8');
    const bifrostSection = compose.split(/\n  bifrost:\s*\n/)[1]?.split(/\n  [a-zA-Z0-9_-]+:\s*\n/)[0] || '';

    expect(bifrostSection).toContain(
      'maximhq/bifrost:v1.6.11@sha256:a0f3e53c0558846ae3103a90de1c2be312ae646c76566af885e200b5f9f9edf7',
    );
    expect(bifrostSection).not.toMatch(/^\s+ports:/m);
    expect(bifrostSection).toContain('BIFROST_SKIP_WRITE_CHECK: "1"');
    expect(bifrostSection).toContain('http://localhost:8080/health');
    expect(compose).toMatch(/bifrost:\s*\n\s+condition: service_healthy/);
    expect(compose).toContain('AI_GATEWAY_BASE_URL: http://bifrost:8080');
  });
});
