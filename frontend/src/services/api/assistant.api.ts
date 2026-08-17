import { config } from '../../constants/config';
import type { AssistantRequest, ChatMessage } from '../../types/assistant';
import { mockAssistant } from '../mock/mockServer';
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';

export const assistantApi = {
  chat: (payload: AssistantRequest): Promise<ChatMessage> =>
    config.useMockApi
      ? mockAssistant.chat(payload)
      : apiClient.post<ChatMessage>(ENDPOINTS.assistant.chat, payload, {
          timeoutMs: config.aiRequestTimeoutMs,
        }),

  thread: (): Promise<ChatMessage[]> =>
    config.useMockApi
      ? mockAssistant.thread()
      : apiClient.get<ChatMessage[]>(ENDPOINTS.assistant.thread),

  clear: (): Promise<void> =>
    config.useMockApi
      ? mockAssistant.clear()
      : apiClient.delete<void>(ENDPOINTS.assistant.thread),
};
