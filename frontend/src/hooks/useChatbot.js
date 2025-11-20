import { useState, useCallback } from 'react';
import chatbotService from '../services/chatbotService';

export default function useChatbot() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(() => chatbotService.getOrCreateSessionId());

  // Add message to history
  const addMessage = useCallback((content, role = 'user', sources = []) => {
    const newMessage = {
      id: Date.now(),
      content,
      role,
      sources,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  // Query chatbot with session
  const ask = useCallback(async (query) => {
    if (!query || !query.trim()) {
      setError('Query cannot be empty');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Add user message to history
      addMessage(query, 'user');

      // Query with session
      const data = await chatbotService.queryChatbot(query, 5, sessionId);
      
      // Add assistant response to history
      const assistantMessage = addMessage(
        data.answer || 'No answer',
        'assistant',
        data.sources || []
      );

      return assistantMessage;
    } catch (e) {
      const errorMessage = e.message || String(e);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [sessionId, addMessage]);

  // Clear history
  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
    chatbotService.clearSessionId();
    const newId = chatbotService.getOrCreateSessionId();
    setSessionId(newId);
  }, []);

  // Get last answer (for backwards compatibility)
  const answer = messages
    .filter(msg => msg.role === 'assistant')
    .map(msg => msg.content)
    .pop() || '';

  // Get sources from last assistant message
  const sources = messages
    .filter(msg => msg.role === 'assistant')
    .map(msg => msg.sources || [])
    .pop() || [];

  return { 
    ask, 
    loading, 
    answer,
    sources,
    error,
    messages,
    clearHistory,
    sessionId
  };
}
