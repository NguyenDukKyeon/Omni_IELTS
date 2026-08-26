export interface SpeakingArtifact {
  id: string;
  sessionId: string;
  userId: string;
  kind: 'transcript' | 'telemetry' | 'feedback';
  createdAt: string;
  payload: unknown;
}

export interface ConsentDecision {
  allowed: boolean;
  reason: 'granted' | 'revoked' | 'missing';
}

export function decideSpeakingArtifactWrite(consent: boolean | undefined): ConsentDecision {
  if (consent === true) return { allowed: true, reason: 'granted' };
  if (consent === false) return { allowed: false, reason: 'revoked' };
  return { allowed: false, reason: 'missing' };
}

export class SpeakingArtifactStore {
  private readonly artifacts: SpeakingArtifact[] = [];

  constructor(private readonly now: () => number = () => Date.now()) {}

  write(input: {
    sessionId: string;
    userId: string;
    kind: SpeakingArtifact['kind'];
    payload: unknown;
    consent: boolean | undefined;
  }): SpeakingArtifact | null {
    const decision = decideSpeakingArtifactWrite(input.consent);
    if (!decision.allowed) return null;
    if (input.kind !== 'transcript' && input.kind !== 'telemetry' && input.kind !== 'feedback') {
      return null;
    }
    if (payloadLooksLikeRawAudio(input.payload)) {
      throw new Error('Raw microphone audio cannot be stored');
    }
    const artifact: SpeakingArtifact = {
      id: `${input.kind}-${this.artifacts.length + 1}`,
      sessionId: input.sessionId,
      userId: input.userId,
      kind: input.kind,
      createdAt: new Date(this.now()).toISOString(),
      payload: input.payload,
    };
    this.artifacts.push(artifact);
    return artifact;
  }

  list(sessionId: string): SpeakingArtifact[] {
    return this.artifacts.filter((artifact) => artifact.sessionId === sessionId);
  }

  clear(): void {
    this.artifacts.length = 0;
  }
}

function payloadLooksLikeRawAudio(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const record = payload as Record<string, unknown>;
  return Boolean(
    record.audioBase64
    || record.fullAudioBase64
    || record.rawAudio
    || record.microphonePcm,
  );
}
