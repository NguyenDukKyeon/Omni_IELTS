import { livekitConfigured, type LivekitEnv, type LivekitInfrastructure, type MintedLivekitAccess } from './livekitSessionService';

export function createLivekitInfrastructure(env: LivekitEnv): LivekitInfrastructure {
  return {
    isConfigured() {
      return livekitConfigured(env);
    },
    async mint(input): Promise<MintedLivekitAccess> {
      if (!livekitConfigured(env)) {
        throw new Error('LiveKit is not configured');
      }
      const { AccessToken } = await import('livekit-server-sdk');
      const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
        identity: input.identity,
        ttl: input.ttlSeconds,
        metadata: JSON.stringify({ sessionId: input.sessionId }),
      });
      token.addGrant({
        roomJoin: true,
        room: input.roomName,
        roomCreate: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });
      return {
        token: await token.toJwt(),
        roomName: input.roomName,
        livekitUrl: env.LIVEKIT_URL!.trim(),
      };
    },
    async dispatchAgent(input) {
      if (!livekitConfigured(env)) return;
      const { AgentDispatchClient } = await import('livekit-server-sdk');
      const client = new AgentDispatchClient(env.LIVEKIT_URL!, env.LIVEKIT_API_KEY!, env.LIVEKIT_API_SECRET!);
      await client.createDispatch(input.roomName, env.LIVEKIT_AGENT_NAME || 'omni-ielts-speaking-examiner', {
        metadata: JSON.stringify(input.metadata),
      });
    },
    async deleteRoom(roomName) {
      if (!livekitConfigured(env)) return;
      const { RoomServiceClient } = await import('livekit-server-sdk');
      const client = new RoomServiceClient(env.LIVEKIT_URL!, env.LIVEKIT_API_KEY!, env.LIVEKIT_API_SECRET!);
      await client.deleteRoom(roomName);
    },
  };
}
