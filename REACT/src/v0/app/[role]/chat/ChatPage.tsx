import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Bell,
  ArrowLeft,
  Check,
  CheckCheck,
  Download,
  Edit3,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  Send,
  Smile,
  Trash2,
  Video,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';

import { estateApi } from '@app/api/estateApi';
import { queryKeys } from '@app/api/queryKeys';
import { useAuth } from '@app/auth/AuthContext';
// Panel removed — DM layout uses flat edge-to-edge shell
import { createChatSocket, type ChatSocketHandle, type ChatSocketStatus } from '@app/services/chatSocket';
import type { Conversation, Message } from '@app/types/domain';
import { safeMediaUrl } from './projectUtils';

type Reaction = { userId?: string; emoji?: string; [key: string]: unknown };
type ChatConversation = Conversation;
type ChatMessage = Message & {
  reactions?: Reaction[];
};

interface ChatUserSearchResult {
  id?: string | number;
  userId?: string | number;
  name?: string;
  email?: string;
  role?: string;
  isOnline?: boolean;
  profilePhotoUrl?: string;
}

interface MessageSearchResult {
  messageId?: string;
  conversationId?: string;
  conversationTitle?: string;
  bodyPreview?: string;
  senderName?: string;
  sentAt?: string;
}

interface UploadResponse {
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

type TokenWindow = Window & {
  FirebasePlugin?: {
    getToken?: (success: (token: string) => void, failure?: (error: unknown) => void) => void;
  };
};

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉'];

function stringValue(value: unknown, fallback = '') {
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

function conversationIdOf(conversation: Partial<ChatConversation>) {
  return stringValue(conversation.conversationId ?? conversation.id);
}

function messageIdOf(message: Partial<ChatMessage>) {
  return stringValue(message.messageId ?? message.id);
}

function normalizeMessage(raw: unknown): ChatMessage {
  const record = (raw ?? {}) as ChatMessage;
  const id = messageIdOf(record);
  const type = stringValue(record.type, 'text').toLowerCase();
  const rawContent = stringValue(record.content ?? record.text);
  const rawFileUrl = stringValue(record.fileUrl);
  const fileUrl = rawFileUrl || (type !== 'text' && isProbablyUrl(rawContent) ? rawContent : '');
  return {
    ...record,
    id,
    messageId: id,
    conversationId: stringValue(record.conversationId),
    senderId: stringValue(record.senderId),
    type,
    content: rawContent,
    text: stringValue(record.text ?? record.content),
    fileUrl,
    fileMimeType: stringValue(record.fileMimeType ?? record.mimeType),
    sentAt: stringValue(record.sentAt ?? record.timestamp),
    timestamp: stringValue(record.timestamp ?? record.sentAt),
    reactions: Array.isArray(record.reactions) ? record.reactions : [],
    readBy: Array.isArray(record.readBy) ? record.readBy.map((value) => stringValue(value)).filter(Boolean) : [],
  };
}

function isProbablyUrl(value: string) {
  return /^(https?:\/\/|\/api\/|chat\/)/i.test(value);
}

function conversationTitle(conversation: Partial<ChatConversation>, currentUserId?: string | number) {
  const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
  const visibleParticipants = participants.filter((participant) => {
    if (!currentUserId) return true;
    return stringValue(participant.userId) !== stringValue(currentUserId);
  });
  const names = visibleParticipants.map((participant) => participant.name).filter(Boolean);
  return conversation.name || names.join(', ') || `Conversation ${conversationIdOf(conversation).slice(0, 8)}`;
}

function lastMessageText(conversation: ChatConversation) {
  if (typeof conversation.lastMessage === 'string') return conversation.lastMessage;
  const last = (conversation.lastMessage ?? {}) as Record<string, unknown>;
  const type = stringValue(last.type, 'text').toLowerCase();
  const fileName = stringValue(last.fileName);
  if (type.startsWith('image')) return fileName ? `Image: ${fileName}` : 'Image';
  if (type.startsWith('video')) return fileName ? `Video: ${fileName}` : 'Video';
  if (fileName || type === 'file' || type === 'document') return fileName ? `Document: ${fileName}` : 'Attachment';
  return stringValue(last.text ?? last.content, 'No messages');
}

function formatWhen(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function upsertMessage(list: ChatMessage[], payload: unknown) {
  const next = normalizeMessage(payload);
  if (!messageIdOf(next)) return list;
  const index = list.findIndex((message) => messageIdOf(message) === messageIdOf(next));
  if (index === -1) return sortMessagesChronologically([...list, next]);
  const clone = [...list];
  clone[index] = { ...clone[index], ...next };
  return sortMessagesChronologically(clone);
}

function mergeMessages(existing: ChatMessage[], incoming: unknown[]): ChatMessage[] {
  return incoming.reduce<ChatMessage[]>((list, message) => upsertMessage(list, message), existing);
}

function updateMessageReactions(list: ChatMessage[], messageId: string, reactions: Reaction[]) {
  return list.map((message) => (messageIdOf(message) === messageId ? { ...message, reactions } : message));
}

function isImageMessage(message: ChatMessage) {
  return (
    stringValue(message.type).toLowerCase() === 'image' ||
    stringValue(message.fileMimeType).startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(stringValue(message.fileUrl))
  );
}

function isVideoMessage(message: ChatMessage) {
  return (
    stringValue(message.type).toLowerCase() === 'video' ||
    stringValue(message.fileMimeType).startsWith('video/') ||
    /\.(mp4|webm|mov)(\?|$)/i.test(stringValue(message.fileUrl))
  );
}

function messageTime(message: Partial<ChatMessage>) {
  const date = new Date(stringValue(message.timestamp ?? message.sentAt));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function sortMessagesChronologically(list: ChatMessage[]) {
  return [...list].sort((a, b) => messageTime(a) - messageTime(b));
}

function conversationTime(conversation: ChatConversation) {
  const last = typeof conversation.lastMessage === 'object' && conversation.lastMessage
    ? stringValue((conversation.lastMessage as Record<string, unknown>).timestamp)
    : '';
  const date = new Date(stringValue(conversation.lastMessageAt ?? conversation.lastMessageTime ?? last));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function conversationPeer(conversation: Partial<ChatConversation>, currentUserId?: string | number) {
  const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
  return participants.find((participant) => stringValue(participant.userId) !== stringValue(currentUserId)) ?? participants[0];
}

function initials(name?: string) {
  return stringValue(name, 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
}

function formatTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function dateSeparatorLabel(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(dateStr, now.toISOString())) return 'Today';
  if (isSameDay(dateStr, yesterday.toISOString())) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

async function resolveDeviceToken() {
  const plugin = (window as TokenWindow).FirebasePlugin;
  if (plugin?.getToken) {
    return new Promise<string>((resolve, reject) => {
      plugin.getToken?.(resolve, reject);
    });
  }

  const stored = window.localStorage.getItem('estate.fcmToken') ?? window.localStorage.getItem('fcmToken');
  if (stored) return stored;

  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    if (permission === 'denied') throw new Error('Browser notifications denied');
  }

  throw new Error('No FCM token provider is available in this browser build');
}

function socketStatusLabel(status: ChatSocketStatus) {
  if (status === 'connected') return 'Live';
  if (status === 'connecting') return 'Connecting';
  if (status === 'reconnecting') return 'Reconnecting';
  if (status === 'error') return 'Socket error';
  return 'Offline';
}

export function ChatPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeConv, setActiveConv] = useState<string | null>(searchParams.get('conversationId'));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [userSearch, setUserSearch] = useState(searchParams.get('name') ?? '');
  const [messageSearch, setMessageSearch] = useState('');
  const [socketStatus, setSocketStatus] = useState<ChatSocketStatus>('idle');
  const [chatError, setChatError] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [notificationState, setNotificationState] = useState('');
  const socketRef = useRef<ChatSocketHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const startedUrlUserRef = useRef('');
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const activeConvRef = useRef(activeConv);
  activeConvRef.current = activeConv;
  const pendingTextRef = useRef<{ conversationId: string; content: string; knownIds: Set<string> } | null>(null);
  const [sending, setSending] = useState(false);

  const currentUserId = stringValue(auth.user?.id);

  const conversations = useQuery<ChatConversation[]>({
    queryKey: queryKeys.chat.conversations(),
    queryFn: async () => (await estateApi.chat.conversations()) as ChatConversation[],
    staleTime: 15000,
  });

  const convList = conversations.data ?? [];
  const sortedConvList = useMemo(
    () => [...convList].sort((a, b) => {
      const unreadDelta = Number(b.unreadCount ?? 0) - Number(a.unreadCount ?? 0);
      if (unreadDelta !== 0) return unreadDelta;
      return conversationTime(b) - conversationTime(a);
    }),
    [convList],
  );
  const activeConversation = useMemo(
    () => convList.find((conversation) => conversationIdOf(conversation) === activeConv),
    [activeConv, convList],
  );

  const activeMessages = useQuery<ChatMessage[]>({
    queryKey: activeConv ? queryKeys.chat.messages(activeConv) : ['chat', 'messages', 'none'],
    queryFn: async () => ((await estateApi.chat.messages(activeConv!)) as ChatMessage[]).map(normalizeMessage),
    enabled: !!activeConv,
  });

  const userSearchQuery = useQuery<ChatUserSearchResult[]>({
    queryKey: queryKeys.chat.userSearch(userSearch),
    queryFn: async () => (await estateApi.chat.searchUsers(userSearch)) as ChatUserSearchResult[],
    enabled: userSearch.trim().length >= 2,
    staleTime: 30000,
  });

  const messageSearchQuery = useQuery<MessageSearchResult[]>({
    queryKey: queryKeys.chat.messageSearch(messageSearch, activeConv ?? undefined),
    queryFn: async () => (await estateApi.chat.searchMessages(messageSearch, activeConv ?? undefined)) as MessageSearchResult[],
    enabled: messageSearch.trim().length >= 2,
    staleTime: 15000,
  });

  const selectConversation = useCallback((conversationId: string | null, replace = true) => {
    if (pendingTextRef.current) {
      setChatError('Please wait for your message delivery to finish before switching conversations.');
      return;
    }
    if (activeConvRef.current !== conversationId) {
      socketRef.current?.typing(activeConvRef.current || '', false);
      setDraft('');
      setTypingUsers({});
      setEditingMessage(null);
      setChatError('');
    }
    setActiveConv(conversationId);
    const next = new URLSearchParams(searchParams);
    next.delete('userId');
    next.delete('name');
    if (conversationId) next.set('conversationId', conversationId);
    else next.delete('conversationId');
    setSearchParams(next, { replace });
  }, [searchParams, setSearchParams]);

  const createConversation = useMutation({
    mutationFn: (participantId: string | number) =>
      estateApi.chat.createConversation({ type: 'direct', participantId }),
    onSuccess: (response) => {
      const conversationId = stringValue((response as Record<string, unknown>).conversationId ?? (response as Record<string, unknown>).id);
      if (conversationId) selectConversation(conversationId);
      setUserSearch('');
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
    },
    onError: (error) => setChatError(error instanceof Error ? error.message : 'Conversation could not be started'),
  });

  const deleteConversation = useMutation({
    mutationFn: (conversationId: string) => estateApi.chat.deleteConversation(conversationId),
    onSuccess: () => {
      selectConversation(null);
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
    },
    onError: (error) => setChatError(error instanceof Error ? error.message : 'Conversation delete failed'),
  });

  const editMessage = useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      estateApi.chat.editMessage(messageId, content),
    onSuccess: (response) => {
      setMessages((prev) => upsertMessage(prev, response));
      setEditingMessage(null);
      setDraft('');
    },
    onError: (error) => setChatError(error instanceof Error ? error.message : 'Message edit failed'),
  });

  const deleteMessage = useMutation({
    mutationFn: (messageId: string) => estateApi.chat.deleteMessage(messageId),
    onSuccess: (_response, messageId) => {
      setMessages((prev) =>
        prev.map((message) => (messageIdOf(message) === messageId ? { ...message, isDeleted: true, content: '', text: '' } : message)),
      );
    },
    onError: (error) => setChatError(error instanceof Error ? error.message : 'Message delete failed'),
  });

  const reactToMessage = useMutation({
    mutationFn: async ({ messageId, emoji, remove }: { messageId: string; emoji: string; remove: boolean }) => {
      if (remove) await estateApi.chat.removeReaction(messageId);
      else await estateApi.chat.react(messageId, emoji);
      const reactions = (await estateApi.chat.reactions(messageId)) as Reaction[];
      return { messageId, reactions };
    },
    onSuccess: ({ messageId, reactions }) => {
      setMessages((prev) => updateMessageReactions(prev, messageId, reactions));
    },
    onError: (error) => setChatError(error instanceof Error ? error.message : 'Reaction update failed'),
  });

  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      if (!activeConv) throw new Error('Select a conversation first');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', activeConv);
      const upload = (await estateApi.chat.upload(formData)) as UploadResponse;
      const mimeType = upload.mimeType ?? file.type;
      const sent = socketRef.current?.send('/app/chat.send', {
        conversationId: activeConv,
        type: mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('video/') ? 'video' : 'file',
        content: upload.fileUrl ?? '',
        fileUrl: upload.fileUrl,
        fileName: upload.fileName ?? file.name,
        fileSize: upload.fileSize ?? file.size,
        fileMimeType: mimeType,
      });
      if (!sent) throw new Error('Chat socket is not connected');
      return upload;
    },
    onError: (error) => setChatError(error instanceof Error ? error.message : 'Upload failed'),
  });

  const registerNotifications = useMutation({
    mutationFn: async () => {
      const token = await resolveDeviceToken();
      return estateApi.chat.fcmToken({ token });
    },
    onSuccess: () => setNotificationState('Notifications registered'),
    onError: (error) => setNotificationState(error instanceof Error ? error.message : 'Notification registration failed'),
  });

  useEffect(() => {
    const urlConversationId = searchParams.get('conversationId');
    if (urlConversationId && urlConversationId !== activeConv) {
      setActiveConv(urlConversationId);
    }
  }, [activeConv, searchParams]);

  useEffect(() => {
    const userId = searchParams.get('userId');
    if (!userId || startedUrlUserRef.current === userId) return;
    startedUrlUserRef.current = userId;
    createConversation.mutate(userId);
  }, [createConversation, searchParams]);

  useEffect(() => {
    if (activeMessages.data) {
      setMessages((prev) => mergeMessages(
        prev.filter((message) => message.conversationId === activeConv),
        activeMessages.data.map(normalizeMessage),
      ));
      const pending = pendingTextRef.current;
      if (pending && activeMessages.data.some(message => !pending.knownIds.has(messageIdOf(message)) && message.senderId === currentUserId && message.content === pending.content && message.conversationId === pending.conversationId)) {
        pendingTextRef.current = null;
        setSending(false);
        setDraft('');
      }
    }
  }, [activeConv, activeMessages.data]);

  useEffect(() => {
    if (!activeConv || !activeMessages.data || document.visibilityState !== 'visible') return;
    const messageIds = activeMessages.data.map(messageIdOf).filter(Boolean);
    estateApi.chat.markRead(activeConv)
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() }))
      .catch((error) => setChatError(error instanceof Error ? error.message : 'Read state update failed'));
    socketRef.current?.markRead(activeConv, messageIds);
  }, [activeConv, activeMessages.data, queryClient]);

  useEffect(() => {
    if (!auth.token || !currentUserId) return undefined;
    const socket = createChatSocket({
      conversationId: activeConvRef.current,
      onStatus: (status) => {
        setSocketStatus(status);
        if (status === 'connected') {
          setChatError('');
          queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
          if (activeConvRef.current) queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(activeConvRef.current) });
        }
      },
      onError: setChatError,
      onInbox: (payload) => {
        const event = (payload ?? {}) as Record<string, unknown>;
        const conversationId = stringValue(event.conversationId);
        if (event.type === 'message.error') {
          setChatError(stringValue(event.message, 'Message could not be sent. Please retry.'));
          pendingTextRef.current = null;
          setSending(false);
          return;
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
        if (conversationId && conversationId === activeConvRef.current) {
          queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(conversationId) });
        }
      },
      onMessage: (payload) => {
        const message = normalizeMessage(payload);
        if (message.conversationId === activeConvRef.current) {
          setMessages((prev) => upsertMessage(prev, message));
          queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
          if (message.senderId === currentUserId && pendingTextRef.current?.content === message.content) {
            pendingTextRef.current = null;
            setSending(false);
            setDraft('');
          }
          if (message.senderId !== currentUserId && document.visibilityState === 'visible') {
            socketRef.current?.markRead(message.conversationId, [messageIdOf(message)]);
          }
        }
      },
      onEdit: (payload) => setMessages((prev) => upsertMessage(prev, payload)),
      onDelete: (payload) => {
        const message = normalizeMessage(payload);
        setMessages((prev) =>
          prev.map((item) => (messageIdOf(item) === messageIdOf(message) ? { ...item, ...message, isDeleted: true } : item)),
        );
      },
      onTyping: (payload) => {
        const record = (payload ?? {}) as Record<string, unknown>;
        const userId = stringValue(record.userId);
        if (!userId || userId === currentUserId) return;
        setTypingUsers((prev) => {
          const next = { ...prev };
          if (record.isTyping) next[userId] = stringValue(record.userName, 'Someone');
          else delete next[userId];
          return next;
        });
      },
      onRead: (payload) => {
        const record = (payload ?? {}) as Record<string, unknown>;
        const userId = stringValue(record.userId);
        const readIds = Array.isArray(record.messageIds) ? record.messageIds.map((value) => stringValue(value)) : [];
        setMessages((prev) =>
          prev.map((message) => {
            if (readIds.length > 0 && !readIds.includes(messageIdOf(message))) return message;
            const readBy = new Set((message.readBy ?? []).map((value) => stringValue(value)));
            if (userId) readBy.add(userId);
            return { ...message, readBy: [...readBy] };
          }),
        );
      },
      onReaction: (payload) => {
        const record = (payload ?? {}) as Record<string, unknown>;
        setMessages((prev) =>
          updateMessageReactions(prev, stringValue(record.messageId), Array.isArray(record.reactions) ? record.reactions as Reaction[] : []),
        );
      },
      onPresence: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
      },
      onCall: (payload) => {
        const record = (payload ?? {}) as Record<string, unknown>;
        if (stringValue(record.senderId) === currentUserId) return;
        const kind = stringValue(record.kind, 'audio');
        const action = stringValue(record.action, 'invite');
        const senderName = stringValue(record.senderName, 'Someone');
        setNotificationState(`${senderName} sent a ${kind} call ${action}`);
      },
    });

    socket.connect();
    socketRef.current = socket;
    return () => {
      if (activeConvRef.current) socket.typing(activeConvRef.current, false);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [auth.token, currentUserId, queryClient]);

  useEffect(() => {
    socketRef.current?.selectConversation(activeConv);
  }, [activeConv]);

  useEffect(() => {
    if (!sending) return;
    const timer = window.setTimeout(() => {
      pendingTextRef.current = null;
      setSending(false);
      setChatError('Delivery is not confirmed. Refresh the conversation before retrying.');
    }, 15000);
    return () => window.clearTimeout(timer);
  }, [sending]);

  const reactionIdsKey = useMemo(() => messages.map(messageIdOf).filter(Boolean).join('|'), [messages]);

  useEffect(() => {
    socketRef.current?.subscribeReactions(reactionIdsKey ? reactionIdsKey.split('|') : []);
  }, [reactionIdsKey]);

  useEffect(() => {
    if (!activeConv || !draft.trim() || editingMessage || !socketRef.current?.isConnected()) return undefined;
    socketRef.current.typing(activeConv, true);
    const timer = window.setTimeout(() => socketRef.current?.typing(activeConv, false), 1200);
    return () => window.clearTimeout(timer);
  }, [activeConv, draft, editingMessage]);

  async function sendMessage() {
    const body = draft.trim();
    if (!body || !activeConv || sending) return;
    setChatError('');
    if (editingMessage) {
      editMessage.mutate({ messageId: messageIdOf(editingMessage), content: body });
      return;
    }
    pendingTextRef.current = { conversationId: activeConv, content: body, knownIds: new Set(messages.map(messageIdOf)) };
    const sent = socketRef.current?.send('/app/chat.send', {
      conversationId: activeConv,
      type: 'text',
      content: body,
    });
    if (!sent) {
      pendingTextRef.current = null;
      setChatError('Chat socket is not connected. Reopen the thread or retry after reconnect.');
      return;
    }
    setSending(true);
    socketRef.current?.typing(activeConv, false);
  }

  function startEdit(message: ChatMessage) {
    setEditingMessage(message);
    setDraft(stringValue(message.content ?? message.text));
  }

  function cancelEdit() {
    setEditingMessage(null);
    setDraft('');
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) uploadFile.mutate(file);
  }

  async function startCall(kind: 'audio' | 'video') {
    if (!activeConv) return;
    setChatError('');
    try {
      await estateApi.chat.iceConfig();
      const sent = socketRef.current?.callSignal(activeConv, {
        action: 'invite',
        kind,
        conversationTitle: activeConversation ? conversationTitle(activeConversation, currentUserId) : 'Conversation',
      });
      if (!sent) {
        setChatError('Chat socket is not connected. Reopen the thread or retry after reconnect.');
        return;
      }
      setNotificationState(`${kind === 'video' ? 'Video' : 'Audio'} call invite sent`);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Call setup failed');
    }
  }

  const visibleMessages = useMemo(
    () => sortMessagesChronologically(messages.filter((message) => message.conversationId === activeConv)),
    [activeConv, messages],
  );
  const activePeer = activeConversation ? conversationPeer(activeConversation, currentUserId) : undefined;
  const activePeerOnline = Boolean(activePeer?.isOnline);
  const typingLabel = Object.values(typingUsers).slice(0, 2).join(', ');

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages.length]);
  const threadStatusLabel = typingLabel
    ? `${typingLabel} typing...`
    : activeConversation
      ? `${activePeerOnline ? 'Online' : 'Offline'}${activePeer?.role ? ` - ${activePeer.role}` : ''}`
      : '';

  function renderAttachment(message: ChatMessage) {
    if (!message.fileUrl) return null;
    const mediaUrl = safeMediaUrl(message.fileUrl);
    if (!mediaUrl) return null;
    const label = stringValue(message.fileName, 'Attachment');
    if (isImageMessage(message)) {
      return (
        <a className="chat-media-link" href={mediaUrl} target="_blank" rel="noreferrer">
          <img src={mediaUrl} alt={label} className="chat-image-preview" />
        </a>
      );
    }
    if (isVideoMessage(message)) {
      return (
        <video className="chat-video-preview" controls preload="metadata">
          <source src={mediaUrl} type={stringValue(message.fileMimeType, 'video/mp4')} />
        </video>
      );
    }
    return (
      <a className="chat-file-link" href={mediaUrl} target="_blank" rel="noreferrer" download={label}>
        <FileText size={18} />
        <span>
          <strong>{label}</strong>
          <small>{stringValue(message.fileMimeType, 'Document')}</small>
        </span>
        <Download size={15} />
      </a>
    );
  }

  const unreadCount = convList.reduce((sum, conversation) => sum + Number(conversation.unreadCount ?? 0), 0);
  const socketConnected = socketStatus === 'connected';

  return (
    <div className={`dm-shell ${activeConv ? 'dm-has-active' : ''}`}>
      {/* ── Sidebar: conversation list ── */}
      <aside className="dm-sidebar">
        <div className="dm-sidebar-header">
          <h2 className="dm-sidebar-title">Messages</h2>
          <div className="dm-sidebar-meta">
            <span className={`dm-conn-dot ${socketConnected ? 'online' : ''}`} />
            <span className="dm-conn-label" role="status">{socketStatusLabel(socketStatus)}</span>
            <button className="dm-icon-btn" type="button" title="Refresh" onClick={() => { void conversations.refetch(); if (activeConv) void activeMessages.refetch(); }}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {!activeConv && chatError ? <div className="dm-banner dm-banner-error" role="alert">{chatError}</div> : null}
        <div className="dm-search">
          <Search size={15} className="dm-search-icon" />
          <input
            id="chat-user-search"
            name="chat-user-search"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Search people"
          />
        </div>

        {userSearchQuery.data?.length ? (
          <div className="dm-user-results">
            {userSearchQuery.data.slice(0, 5).map((user) => {
              const userId = user.userId ?? user.id;
              return (
                <button
                  key={stringValue(userId)}
                  type="button"
                  className="dm-user-result"
                  onClick={() => {
                    if (!userId) return;
                    setUserSearch('');
                    createConversation.mutate(userId);
                  }}
                >
                  <span className="dm-avatar dm-avatar-sm">
                    {user.profilePhotoUrl
                      ? <img src={user.profilePhotoUrl} alt="" />
                      : initials(user.name ?? user.email)}
                  </span>
                  <span className="dm-user-result-info">
                    <strong>{user.name ?? user.email ?? 'User'}</strong>
                    <small>{user.email ?? user.role ?? ''}</small>
                  </span>
                  <span className={`dm-presence-pip ${user.isOnline ? 'online' : ''}`} />
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="dm-conv-list">
          {conversations.isError ? <p className="dm-empty-sidebar" role="alert">Unable to load conversations. Use Refresh to retry.</p> : null}
          {userSearch.trim().length >= 2 && !userSearchQuery.isFetching && !userSearchQuery.data?.length ? <p className="dm-empty-sidebar">{userSearchQuery.isError ? 'Could not search teammates. Try again.' : 'No teammates found. Ask your administrator to create their account.'}</p> : null}
          {convList.length === 0 ? (
            <div className="dm-empty-sidebar">
              <MessageSquare size={20} />
              <p>No conversations</p>
            </div>
          ) : (
            sortedConvList.map((conversation) => {
              const conversationId = conversationIdOf(conversation);
              const peer = conversationPeer(conversation, currentUserId);
              const title = conversationTitle(conversation, currentUserId);
              const isActive = activeConv === conversationId;
              return (
                <button
                  key={conversationId}
                  className={`dm-conv-item ${isActive ? 'active' : ''}`}
                  type="button"
                  onClick={() => selectConversation(conversationId)}
                >
                  <span className="dm-avatar">
                    {peer?.profilePhotoUrl ? <img src={peer.profilePhotoUrl} alt="" /> : initials(title)}
                    {peer?.isOnline ? <span className="dm-online-ring" /> : null}
                  </span>
                  <span className="dm-conv-info">
                    <span className="dm-conv-name-row">
                      <strong>{title}</strong>
                      <time>{formatWhen(stringValue(conversation.lastMessageAt ?? conversation.lastMessageTime))}</time>
                    </span>
                    <p>{lastMessageText(conversation)}</p>
                  </span>
                  {conversation.unreadCount ? <span className="dm-unread-badge">{conversation.unreadCount}</span> : null}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Thread: active conversation ── */}
      <main className="dm-thread">
        {activeConv && activeConversation ? (
          <>
            {/* Thread header */}
            <div className="dm-thread-header">
              <span className="dm-avatar">
                {activePeer?.profilePhotoUrl
                  ? <img src={activePeer.profilePhotoUrl} alt="" />
                  : initials(conversationTitle(activeConversation, currentUserId))}
                {activePeerOnline ? <span className="dm-online-ring" /> : null}
              </span>
              <button className="dm-icon-btn dm-mobile-back" type="button" aria-label="Back to conversations" onClick={() => selectConversation(null)}><ArrowLeft size={18} /></button>
              <div className="dm-thread-header-info">
                <strong>{conversationTitle(activeConversation, currentUserId)}</strong>
                <span className="dm-thread-status">
                  {typingLabel
                    ? `${typingLabel} typing...`
                    : activePeerOnline ? 'Online' : `Offline${activePeer?.role ? ` · ${activePeer.role}` : ''}`}
                </span>
              </div>
              <div className="dm-thread-actions">
                <button className="dm-icon-btn" type="button" title="Search messages" onClick={() => setShowMsgSearch((v) => !v)}>
                  <Search size={16} />
                </button>
                <button className="dm-icon-btn" type="button" title="Audio call" onClick={() => startCall('audio')}>
                  <Phone size={16} />
                </button>
                <button className="dm-icon-btn" type="button" title="Video call" onClick={() => startCall('video')}>
                  <Video size={16} />
                </button>
                <button
                  className="dm-icon-btn"
                  type="button"
                  title="Notifications"
                  onClick={() => registerNotifications.mutate()}
                  disabled={registerNotifications.isPending}
                >
                  <Bell size={16} />
                </button>
                <button
                  className="dm-icon-btn dm-icon-btn-danger"
                  type="button"
                  title="Delete conversation"
                  onClick={() => {
                    if (activeConv && window.confirm('Delete this conversation?')) deleteConversation.mutate(activeConv);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Message search bar (collapsible) */}
            {showMsgSearch ? (
              <div className="dm-msg-search-bar">
                <Search size={14} />
                <input
                  id="chat-message-search"
                  name="chat-message-search"
                  value={messageSearch}
                  onChange={(event) => setMessageSearch(event.target.value)}
                  placeholder="Search in conversation..."
                  autoFocus
                />
                <button className="dm-icon-btn" type="button" onClick={() => { setShowMsgSearch(false); setMessageSearch(''); }}>
                  <X size={14} />
                </button>
              </div>
            ) : null}

            {/* Message search results */}
            {messageSearchQuery.data?.length ? (
              <div className="dm-msg-search-results">
                {messageSearchQuery.data.slice(0, 5).map((result) => (
                  <button
                    key={result.messageId}
                    type="button"
                    className="dm-msg-search-hit"
                    onClick={() => result.conversationId && selectConversation(result.conversationId)}
                  >
                    <MessageSquare size={13} />
                    <span>
                      <strong>{result.senderName ?? 'Message'}</strong>
                      <small>{result.bodyPreview ?? ''}</small>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {/* Banners */}
            {chatError || activeMessages.isError ? (
              <div className="dm-banner dm-banner-error" role="alert">
                <span>{chatError || 'Unable to load messages. Use Refresh to retry.'}</span>
                <button type="button" className="dm-icon-btn" onClick={() => setChatError('')}><X size={14} /></button>
              </div>
            ) : null}
            {notificationState ? (
              <div className="dm-banner dm-banner-info">
                <span>{notificationState}</span>
                <button type="button" className="dm-icon-btn" onClick={() => setNotificationState('')}><X size={14} /></button>
              </div>
            ) : null}

            {/* Messages area */}
            <div className="dm-messages">
              {visibleMessages.length === 0 ? (
                <div className="dm-empty-thread">
                  <div className="dm-empty-thread-icon">
                    <MessageSquare size={28} />
                  </div>
                  <p>No messages yet</p>
                  <small>Send a message to start the conversation</small>
                </div>
              ) : (
                visibleMessages.map((message, index) => {
                  const id = messageIdOf(message);
                  const own = currentUserId && stringValue(message.senderId) === currentUserId;
                  const rawText = stringValue(message.content ?? message.text);
                  const text = message.isDeleted
                    ? 'Message deleted'
                    : message.fileUrl && isProbablyUrl(rawText)
                      ? ''
                      : rawText;
                  const userReaction = message.reactions?.find((r) => r.userId === currentUserId);
                  const readByOthers = (message.readBy ?? []).filter((uid) => stringValue(uid) !== currentUserId);
                  const status = stringValue(message.status, 'sent').toLowerCase();

                  // Grouping: cluster consecutive same-sender messages within 2 min
                  const prev = visibleMessages[index - 1];
                  const next = visibleMessages[index + 1];
                  const prevSame = prev && stringValue(prev.senderId) === stringValue(message.senderId) && !prev.isDeleted;
                  const nextSame = next && stringValue(next.senderId) === stringValue(message.senderId) && !next.isDeleted;
                  const gapFromPrev = prev ? messageTime(message) - messageTime(prev) : Infinity;
                  const gapToNext = next ? messageTime(next) - messageTime(message) : Infinity;
                  const isGroupStart = !prevSame || gapFromPrev > 120_000;
                  const isGroupEnd = !nextSame || gapToNext > 120_000;

                  // Date separator
                  const prevDate = prev ? stringValue(prev.timestamp ?? prev.sentAt) : '';
                  const currDate = stringValue(message.timestamp ?? message.sentAt);
                  const showDateSep = !prev || (prevDate && currDate && !isSameDay(prevDate, currDate));

                  return (
                    <Fragment key={id}>
                      {showDateSep && currDate ? (
                        <div className="dm-date-sep">
                          <span>{dateSeparatorLabel(currDate)}</span>
                        </div>
                      ) : null}

                      <div
                        className={[
                          'dm-msg',
                          own ? 'dm-msg-own' : '',
                          message.isDeleted ? 'dm-msg-deleted' : '',
                          isGroupStart ? 'dm-msg-first' : '',
                          isGroupEnd ? 'dm-msg-last' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        {/* Avatar column (other user only, first in group) */}
                        {!own && isGroupStart ? (
                          <span className="dm-avatar dm-msg-avatar">
                            {activePeer?.profilePhotoUrl
                              ? <img src={activePeer.profilePhotoUrl} alt="" />
                              : initials(message.senderName ?? '')}
                          </span>
                        ) : !own ? <span className="dm-msg-avatar-spacer" /> : null}

                        <div className="dm-msg-body">
                          {/* Sender name (other, first in group) */}
                          {!own && isGroupStart ? (
                            <span className="dm-msg-sender">{message.senderName ?? message.senderId}</span>
                          ) : null}

                          <div className="dm-msg-bubble-row">
                            {/* Actions on the left for own messages */}
                            {own && !message.isDeleted ? (
                              <div className="dm-msg-actions">
                                <div role="group" aria-label="React to message" tabIndex={0} className="dm-msg-action-btn dm-react-trigger">
                                  <Smile size={14} />
                                  <div className="dm-react-popup">
                                    {REACTION_EMOJIS.map((emoji) => (
                                      <button
                                        key={emoji}
                                        type="button"
                                        className={userReaction?.emoji === emoji ? 'active' : ''}
                                        onClick={() => reactToMessage.mutate({ messageId: id, emoji, remove: userReaction?.emoji === emoji })}
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <button type="button" title="Edit" className="dm-msg-action-btn" onClick={() => startEdit(message)}>
                                  <Edit3 size={13} />
                                </button>
                                <button type="button" title="Delete" className="dm-msg-action-btn" onClick={() => deleteMessage.mutate(id)}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ) : null}

                            <div className={`dm-bubble ${message.isDeleted ? 'dm-bubble-deleted' : ''}`}>
                              {message.replyTo ? (
                                <span className="dm-reply-chip">{stringValue(message.replyTo.text ?? message.replyTo.messageId)}</span>
                              ) : null}
                              {renderAttachment(message)}
                              {text ? <p>{text}</p> : null}
                              <time className="dm-bubble-time">{formatTime(message.timestamp ?? message.sentAt)}</time>
                            </div>

                            {/* Actions on the right for other's messages */}
                            {!own && !message.isDeleted ? (
                              <div className="dm-msg-actions">
                                <div role="group" aria-label="React to message" tabIndex={0} className="dm-msg-action-btn dm-react-trigger">
                                  <Smile size={14} />
                                  <div className="dm-react-popup">
                                    {REACTION_EMOJIS.map((emoji) => (
                                      <button
                                        key={emoji}
                                        type="button"
                                        className={userReaction?.emoji === emoji ? 'active' : ''}
                                        onClick={() => reactToMessage.mutate({ messageId: id, emoji, remove: userReaction?.emoji === emoji })}
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          {/* Inline reactions */}
                          {message.reactions?.length ? (
                            <div className="dm-reactions">
                              {message.reactions.map((reaction, i) => (
                                <span key={`${id}-${reaction.userId ?? i}-${reaction.emoji}`} className="dm-reaction-chip">{reaction.emoji}</span>
                              ))}
                            </div>
                          ) : null}

                          {/* Read state (own, last in group) */}
                          {own && isGroupEnd ? (
                            <span className={`dm-read-state ${readByOthers.length > 0 ? 'read' : ''}`}>
                              {readByOthers.length > 0 || status === 'delivered'
                                ? <CheckCheck size={12} />
                                : <Check size={12} />}
                              {readByOthers.length > 0 ? 'Read' : status === 'delivered' ? 'Delivered' : 'Sent'}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Fragment>
                  );
                })
              )}

              {/* Typing indicator as animated dots */}
              {typingLabel ? (
                <div className="dm-msg">
                  <span className="dm-avatar dm-msg-avatar">
                    {activePeer?.profilePhotoUrl
                      ? <img src={activePeer.profilePhotoUrl} alt="" />
                      : initials(typingLabel)}
                  </span>
                  <div className="dm-msg-body">
                    <div className="dm-bubble dm-typing-bubble">
                      <span className="dm-typing-dots">
                        <i /><i /><i />
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="dm-composer">
              <input
                ref={fileInputRef}
                id="chat-file-input"
                name="chat-file-input"
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                className="sr-only"
                onChange={onFileChange}
              />

              {editingMessage ? (
                <div className="dm-edit-banner">
                  <Edit3 size={13} />
                  <span>Editing message</span>
                  <button type="button" className="dm-icon-btn" onClick={cancelEdit}><X size={14} /></button>
                </div>
              ) : null}

              <div className="dm-composer-row">
                <button className="dm-icon-btn" type="button" title="Attach file" onClick={() => fileInputRef.current?.click()}>
                  {uploadFile.isPending ? <RefreshCw size={16} className="dm-spin" /> : <Paperclip size={18} />}
                </button>
                <div className="dm-input-wrap">
                  <textarea
                    id="chat-message-input"
                    name="chat-message-input"
                    rows={1}
                    disabled={sending}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={editingMessage ? 'Edit message...' : 'Message...'}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                </div>
                <button
                  className="dm-send-btn"
                  type="button"
                  onClick={sendMessage}
                  disabled={!draft.trim() || editMessage.isPending || sending || !socketConnected}
                  aria-label={sending ? 'Sending message' : 'Send message'}
                  title="Send"
                >
                  {sending ? <RefreshCw size={16} className="dm-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="dm-empty-thread">
            <div className="dm-empty-thread-icon">
              <MessageSquare size={32} />
            </div>
            <h3>Your Messages</h3>
            <p>Select a conversation or search for someone to start chatting.</p>
          </div>
        )}
      </main>
    </div>
  );
}
