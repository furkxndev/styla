import { useEffect } from 'react';
import { useAssistantStore } from '../store/assistantStore';

export const useAssistant = () => {
  const messages = useAssistantStore((state) => state.messages);
  const sending = useAssistantStore((state) => state.sending);
  const error = useAssistantStore((state) => state.error);
  const send = useAssistantStore((state) => state.send);
  const retryLast = useAssistantStore((state) => state.retryLast);
  const clear = useAssistantStore((state) => state.clear);
  const loadThread = useAssistantStore((state) => state.loadThread);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  return { messages, sending, error, send, retryLast, clear };
};
