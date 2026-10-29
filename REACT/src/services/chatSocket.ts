import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import { env } from '../config/env';
import { tokenStore } from './tokenStore';

export type ChatSocketStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

type PayloadHandler = (payload: unknown) => void;

export interface ChatSocketOptions {
  conversationId?: string | null;
  messageIds?: string[];
  onMessage?: PayloadHandler;
  onEdit?: PayloadHandler;
  onDelete?: PayloadHandler;
  onTyping?: PayloadHandler;
  onRead?: PayloadHandler;
  onReaction?: PayloadHandler;
  onPresence?: PayloadHandler;
  onCall?: PayloadHandler;
  onInbox?: PayloadHandler;
  onStatus?: (status: ChatSocketStatus) => void;
  onError?: (message: string) => void;
}

export interface ChatSocketHandle {
  connect: () => void;
  disconnect: () => Promise<void>;
  send: (destination: string, body: unknown) => boolean;
  subscribeReactions: (messageIds: string[]) => void;
  markRead: (conversationId: string, messageIds?: string[]) => boolean;
  typing: (conversationId: string, isTyping: boolean) => boolean;
  callSignal: (conversationId: string, body: Record<string, unknown>) => boolean;
  isConnected: () => boolean;
  selectConversation: (conversationId: string | null) => void;
}

const activeClients = new Set<Client>();

function authHeaders(): Record<string, string> {
  const token = tokenStore.get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function parseMessage(message: IMessage) {
  try {
    return JSON.parse(message.body);
  } catch {
    return message.body;
  }
}

function normalizeOptions(input: ChatSocketOptions | PayloadHandler): ChatSocketOptions {
  return typeof input === 'function' ? { onMessage: input } : input;
}

export async function disconnectChatSockets() {
  const clients = [...activeClients];
  activeClients.clear();
  await Promise.all(clients.map((client) => client.deactivate().catch(() => undefined)));
}

export function createChatSocket(input: ChatSocketOptions | PayloadHandler): ChatSocketHandle {
  const options = normalizeOptions(input);
  const reactionSubscriptions = new Map<string, StompSubscription>();
  const baseSubscriptions: StompSubscription[] = [];
  const trackedReactionIds = new Set(options.messageIds ?? []);
  let selectedConversation = options.conversationId;

  const notifyStatus = (status: ChatSocketStatus) => options.onStatus?.(status);
  const notifyError = (message: string) => options.onError?.(message);

  const client = new Client({
    brokerURL: env.wsUrl,
    connectHeaders: authHeaders(),
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => undefined,
    beforeConnect: () => {
      client.connectHeaders = authHeaders();
      notifyStatus('connecting');
    },
    onConnect: () => {
      notifyStatus('connected');
      reactionSubscriptions.clear();
      subscribeBaseTopics();
      syncReactionSubscriptions();
      publish('/app/chat.join', {});
    },
    onDisconnect: () => notifyStatus('disconnected'),
    onStompError: (frame) => {
      notifyStatus('error');
      notifyError(frame.headers.message ?? 'Chat socket error');
    },
    onWebSocketError: () => {
      notifyStatus('error');
      notifyError('Chat socket connection failed');
    },
    onWebSocketClose: () => {
      notifyStatus((client as Client & { active?: boolean }).active ? 'reconnecting' : 'disconnected');
    },
  });

  activeClients.add(client);

  function subscribe(destination: string, handler?: PayloadHandler) {
    if (!handler || !client.connected) return undefined;
    return client.subscribe(destination, (message) => handler(parseMessage(message)));
  }

  function subscribeBaseTopics() {
    while (baseSubscriptions.length) {
      baseSubscriptions.pop()?.unsubscribe();
    }

    const conversationId = selectedConversation;
    if (conversationId) {
      const topics: Array<[string, PayloadHandler | undefined]> = [
        [`/topic/conversation.${conversationId}`, options.onMessage],
        [`/topic/conversation.${conversationId}.edit`, options.onEdit],
        [`/topic/conversation.${conversationId}.delete`, options.onDelete],
        [`/topic/conversation.${conversationId}.typing`, options.onTyping],
        [`/topic/conversation.${conversationId}.read`, options.onRead],
        [`/topic/conversation.${conversationId}.call`, options.onCall],
      ];
      for (const [topic, handler] of topics) {
        const subscription = subscribe(topic, handler);
        if (subscription) baseSubscriptions.push(subscription);
      }
    }

    const presenceSubscription = subscribe('/topic/user.status', options.onPresence);
    if (presenceSubscription) baseSubscriptions.push(presenceSubscription);

    const inboxSubscription = subscribe('/user/queue/chat', options.onInbox);
    if (inboxSubscription) baseSubscriptions.push(inboxSubscription);
  }

  function syncReactionSubscriptions() {
    if (!client.connected) return;
    for (const messageId of [...reactionSubscriptions.keys()]) {
      if (!trackedReactionIds.has(messageId)) {
        reactionSubscriptions.get(messageId)?.unsubscribe();
        reactionSubscriptions.delete(messageId);
      }
    }
    if (!options.onReaction) return;
    for (const messageId of trackedReactionIds) {
      if (reactionSubscriptions.has(messageId)) continue;
      const subscription = client.subscribe(`/topic/reaction.${messageId}`, (message) => {
        options.onReaction?.(parseMessage(message));
      });
      reactionSubscriptions.set(messageId, subscription);
    }
  }

  function publish(destination: string, body: unknown) {
    if (!client.connected) return false;
    try {
      client.publish({
        destination,
        body: JSON.stringify(body),
        headers: authHeaders(),
      });
      return true;
    } catch (error) {
      notifyStatus('error');
      notifyError(error instanceof Error ? error.message : 'Chat socket publish failed');
      return false;
    }
  }

  return {
    connect: () => client.activate(),
    disconnect: async () => {
      activeClients.delete(client);
      reactionSubscriptions.forEach((subscription) => subscription.unsubscribe());
      reactionSubscriptions.clear();
      baseSubscriptions.forEach((subscription) => subscription.unsubscribe());
      baseSubscriptions.length = 0;
      await client.deactivate();
    },
    send: publish,
    subscribeReactions: (messageIds: string[]) => {
      trackedReactionIds.clear();
      messageIds.filter(Boolean).forEach((messageId) => trackedReactionIds.add(messageId));
      syncReactionSubscriptions();
    },
    markRead: (conversationId: string, messageIds?: string[]) =>
      publish('/app/chat.read', { conversationId, messageIds: messageIds ?? [] }),
    typing: (conversationId: string, isTyping: boolean) =>
      publish('/app/chat.typing', { conversationId, isTyping }),
    callSignal: (conversationId: string, body: Record<string, unknown>) =>
      publish('/app/chat.call', { ...body, conversationId }),
    isConnected: () => client.connected,
    selectConversation: (conversationId) => {
      if (selectedConversation === conversationId) return;
      selectedConversation = conversationId;
      reactionSubscriptions.forEach(subscription => subscription.unsubscribe());
      reactionSubscriptions.clear();
      trackedReactionIds.clear();
      if (client.connected) subscribeBaseTopics();
    },
  };
}
