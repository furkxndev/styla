import { create } from 'zustand';
import { config } from '../constants/config';
import { assistantApi } from '../services/api';
import type { ChatMessage } from '../types/assistant';
import { ApiError } from '../types/api';
import { createId } from '../utils/id';

interface AssistantState {
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;

  loadThread: () => Promise<void>;
  send: (message: string, focusItemId?: string) => Promise<void>;
  retryLast: () => Promise<void>;
  clear: () => Promise<void>;
  reset: () => void;
}

const WELCOME: ChatMessage = {
  id: 'assistant_welcome',
  role: 'assistant',
  content:
    'Merhaba! Ben senin stil asistanınım. Gardırobundaki parçaları biliyorum — "Bugün ne giysem?" ya da "Bu gömleği nasıl kombinlerim?" diye sorabilirsin.',
  createdAt: new Date().toISOString(),
  status: 'sent',
};

export const useAssistantStore = create<AssistantState>((set, get) => ({
  messages: [WELCOME],
  sending: false,
  error: null,

  async loadThread() {
    try {
      const thread = await assistantApi.thread();
      set({ messages: thread.length ? [WELCOME, ...thread] : [WELCOME] });
    } catch {
      // Geçmiş yüklenemezse karşılama mesajıyla devam
    }
  },

  async send(message, focusItemId) {
    const trimmed = message.trim();
    if (!trimmed || get().sending) return;

    const optimistic: ChatMessage = {
      id: createId('msg'),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    set({ messages: [...get().messages, optimistic], sending: true, error: null });

    const history = get()
      .messages.slice(-config.assistant.maxHistoryMessages)
      .map(({ role, content }) => ({ role, content }));

    try {
      const reply = await assistantApi.chat({ message: trimmed, history, focusItemId });
      set({
        messages: [
          ...get().messages.map((m) =>
            m.id === optimistic.id ? { ...m, status: 'sent' as const } : m,
          ),
          reply,
        ],
        sending: false,
      });
    } catch (error) {
      set({
        messages: get().messages.map((m) =>
          m.id === optimistic.id ? { ...m, status: 'error' as const } : m,
        ),
        sending: false,
        error:
          error instanceof ApiError ? error.message : 'Asistana ulaşılamadı. Tekrar dene.',
      });
    }
  },

  async retryLast() {
    const lastUser = [...get().messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    set({
      messages: get().messages.filter((m) => m.id !== lastUser.id),
    });
    await get().send(lastUser.content);
  },

  async clear() {
    await assistantApi.clear().catch(() => undefined);
    set({ messages: [WELCOME], error: null });
  },

  reset() {
    set({ messages: [WELCOME], sending: false, error: null });
  },
}));
