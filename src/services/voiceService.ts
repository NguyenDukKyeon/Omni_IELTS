import { TtsArtifact, TtsRequest, VoiceDescriptor } from '../types';

export type VoiceUseCase = 'examiner' | 'pronunciation' | 'narrator' | 'dialogue';

const GEMINI_VOICE_NAMES = [
  'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede', 'Callirrhoe', 'Autonoe',
  'Enceladus', 'Iapetus', 'Umbriel', 'Algieba', 'Despina', 'Erinome', 'Algenib', 'Rasalgethi',
  'Laomedeia', 'Achernar', 'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi',
  'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat',
] as const;

export const GEMINI_VOICES: VoiceDescriptor[] = GEMINI_VOICE_NAMES.map((name) => ({
  provider: 'gemini',
  id: name,
  name: `Gemini ${name}`,
  locale: 'en',
  accent: 'International',
  previewSupported: true,
}));

export const VOICE_PRESETS: Record<string, { voiceId: string; provider: 'browser' | 'gemini'; style: string; pace: number; locale: string }> = {
  uk_examiner: { voiceId: 'Kore', provider: 'gemini', style: 'Clear mature British IELTS examiner', pace: 0.94, locale: 'en-GB' },
  australian_examiner: { voiceId: 'Orus', provider: 'gemini', style: 'Clear Australian IELTS examiner', pace: 0.94, locale: 'en-AU' },
  us_academic: { voiceId: 'Charon', provider: 'gemini', style: 'Calm US academic narrator', pace: 0.96, locale: 'en-US' },
  dialogue: { voiceId: 'Puck', provider: 'gemini', style: 'Natural two-speaker educational dialogue', pace: 0.95, locale: 'en-GB' },
  slow_coach: { voiceId: 'Leda', provider: 'gemini', style: 'Slow pronunciation coach with crisp final sounds', pace: 0.78, locale: 'en-GB' },
};

export function getBrowserVoices(): VoiceDescriptor[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices()
    .filter((voice) => voice.lang.toLocaleLowerCase().startsWith('en'))
    .map((voice) => ({
      provider: 'browser',
      id: voice.voiceURI,
      name: voice.name,
      locale: voice.lang,
      accent: voice.lang.includes('GB') ? 'British' : voice.lang.includes('AU') ? 'Australian' : voice.lang.includes('US') ? 'American' : 'International',
      previewSupported: true,
      localService: voice.localService,
    }));
}

export function subscribeToBrowserVoices(callback: (voices: VoiceDescriptor[]) => void): () => void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return () => undefined;
  const update = () => callback(getBrowserVoices());
  update();
  window.speechSynthesis.addEventListener('voiceschanged', update);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
}

const pcmToWav = (base64: string, sampleRate = 24_000): Blob => {
  const raw = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const write = (offset: number, text: string) => [...text].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  write(0, 'RIFF'); view.setUint32(4, 36 + raw.byteLength, true); write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, 'data'); view.setUint32(40, raw.byteLength, true);
  return new Blob([header, raw], { type: 'audio/wav' });
};

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function synthesizeGeminiVoice(request: TtsRequest): Promise<{ artifact: TtsArtifact; audioUrl: string }> {
  const hash = await sha256(JSON.stringify(request));
  const cache = 'caches' in window ? await caches.open('omni-private-tts-v1') : null;
  const cacheKey = `/__omni_tts_cache__/${hash}`;
  const cached = await cache?.match(cacheKey);
  if (cached) {
    return {
      artifact: {
        provider: 'gemini',
        contentHash: hash,
        mimeType: 'audio/wav',
        audioBase64: '',
        validation: { valid: true, warnings: [] },
      },
      audioUrl: URL.createObjectURL(await cached.blob()),
    };
  }
  const apiKey = sessionStorage.getItem('omni_gemini_api_key');
  const response = await fetch('/api/tts/synthesize', {
    method: 'POST',
    headers: apiKey ? { 'Content-Type': 'application/json', 'x-gemini-api-key': apiKey } : { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Gemini TTS unavailable');
  const artifact = await response.json() as TtsArtifact;
  const wav = pcmToWav(artifact.audioBase64);
  if (cache) await cache.put(cacheKey, new Response(wav, { headers: { 'Content-Type': 'audio/wav' } }));
  return { artifact, audioUrl: URL.createObjectURL(wav) };
}

export async function playVoiceText(text: string, options: {
  useCase?: VoiceUseCase;
  descriptor?: VoiceDescriptor;
  rate?: number;
  style?: string;
  locale?: string;
  onEnd?: () => void;
} = {}): Promise<() => void> {
  const useCase = options.useCase || 'examiner';
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(`omni_voice_${useCase}`) : null;
  const savedSettings = typeof localStorage !== 'undefined'
    ? JSON.parse(localStorage.getItem(`omni_voice_settings_${useCase}`) || '{}') as { pace?: number; style?: string }
    : {};
  const descriptor = options.descriptor || (saved ? JSON.parse(saved) as VoiceDescriptor : undefined);
  const pace = options.rate || savedSettings.pace || 0.95;
  const style = options.style || savedSettings.style || descriptor?.style;
  if (descriptor?.provider === 'gemini') {
    try {
      const { audioUrl } = await synthesizeGeminiVoice({ text, voiceId: descriptor.id, style, pace });
      const audio = new Audio(audioUrl);
      void audio.play();
      audio.onended = () => { URL.revokeObjectURL(audioUrl); options.onEnd?.(); };
      audio.onerror = () => options.onEnd?.();
      return () => { audio.pause(); URL.revokeObjectURL(audioUrl); };
    } catch (error) {
      console.warn('Gemini voice unavailable; using browser fallback:', error);
    }
  }
  if (!window.speechSynthesis) return () => undefined;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = pace;
  utterance.lang = options.locale || descriptor?.locale || 'en-GB';
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find((voice) => voice.voiceURI === descriptor?.id)
    || voices.find((voice) => voice.lang === utterance.lang)
    || voices.find((voice) => voice.lang.startsWith('en'))
    || null;
  window.speechSynthesis.cancel();
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = () => options.onEnd?.();
  window.speechSynthesis.speak(utterance);
  return () => window.speechSynthesis.cancel();
}
