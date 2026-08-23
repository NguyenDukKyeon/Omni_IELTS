import React, { useEffect, useMemo, useState } from 'react';
import { Play, Volume2 } from 'lucide-react';
import { VoiceDescriptor } from '../../types';
import { GEMINI_VOICES, getBrowserVoices, playVoiceText, subscribeToBrowserVoices, VoiceUseCase } from '../../services/voiceService';

export const VoicePicker: React.FC<{ useCase?: VoiceUseCase; compact?: boolean }> = ({ useCase = 'examiner', compact = false }) => {
  const [browserVoices, setBrowserVoices] = useState<VoiceDescriptor[]>(getBrowserVoices);
  const storageKey = `omni_voice_${useCase}`;
  const settingsKey = `omni_voice_settings_${useCase}`;
  const [selectedKey, setSelectedKey] = useState(() => localStorage.getItem(storageKey) || '');
  const [pace, setPace] = useState(() => Number(JSON.parse(localStorage.getItem(settingsKey) || '{}').pace || 0.94));
  const [style, setStyle] = useState(() => String(JSON.parse(localStorage.getItem(settingsKey) || '{}').style || 'Clear and mature'));
  useEffect(() => subscribeToBrowserVoices(setBrowserVoices), []);
  const voices = useMemo(() => [...browserVoices, ...GEMINI_VOICES], [browserVoices]);
  const selected = voices.find((voice) => JSON.stringify(voice) === selectedKey) || browserVoices[0] || GEMINI_VOICES[3];

  const choose = (voice: VoiceDescriptor) => {
    const serialized = JSON.stringify(voice);
    setSelectedKey(serialized);
    localStorage.setItem(storageKey, serialized);
  };

  const saveSettings = (nextPace: number, nextStyle: string) => {
    setPace(nextPace);
    setStyle(nextStyle);
    localStorage.setItem(settingsKey, JSON.stringify({ pace: nextPace, style: nextStyle }));
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'rounded-2xl border border-slate-200 p-3 dark:border-slate-700'}`}>
      <Volume2 className="h-4 w-4 shrink-0 text-indigo-500" />
      <select data-ux-flow="app.shared"
        value={selected ? JSON.stringify(selected) : ''}
        onChange={(event) => {
          const voice = voices.find((candidate) => JSON.stringify(candidate) === event.target.value);
          if (voice) choose(voice);
        }}
        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
        aria-label="Chọn giọng đọc mặc định"
      >
        <optgroup label={`Browser / Edge (${browserVoices.length})`}>
          {browserVoices.map((voice) => <option key={voice.id} value={JSON.stringify(voice)}>{voice.name} · {voice.locale} · {voice.accent}</option>)}
        </optgroup>
        <optgroup label="Gemini (30 giọng · Preview)">
          {GEMINI_VOICES.map((voice) => <option key={voice.id} value={JSON.stringify(voice)}>{voice.name}</option>)}
        </optgroup>
      </select>
      <select data-ux-flow="app.shared" aria-label="Phong cách giọng" value={style} onChange={event => saveSettings(pace, event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900">
        <option>Clear and mature</option>
        <option>Warm examiner</option>
        <option>Academic narrator</option>
        <option>Slow pronunciation coach</option>
      </select>
      <select data-ux-flow="app.shared" aria-label="Tốc độ giọng" value={pace} onChange={event => saveSettings(Number(event.target.value), style)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900">
        <option value={0.8}>0.80×</option>
        <option value={0.94}>0.94×</option>
        <option value={1}>1.00×</option>
      </select>
      <button data-ux-flow="app.shared" type="button" onClick={() => void playVoiceText('Welcome to your Omni IELTS practice session.', { descriptor: selected, useCase: useCase as VoiceUseCase, rate: pace, style })} className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/50" title="Nghe thử giọng">
        <Play className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
