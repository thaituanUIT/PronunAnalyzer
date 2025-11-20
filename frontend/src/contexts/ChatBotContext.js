import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { queryChatbot, getOrCreateSessionId, clearSessionId } from '../services/chatbotService';

const ChatBotContext = createContext();

export const useChatBot = () => {
  const context = useContext(ChatBotContext);
  if (!context) {
    throw new Error('useChatBot must be used within a ChatBotProvider');
  }
  return context;
};

// Default chatbot configuration
const DEFAULT_CHATBOT_CONFIG = {
  maxResults: 5,
  maxHistoryLength: 50,
  autoSaveHistory: true,
};

export const ChatBotProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(DEFAULT_CHATBOT_CONFIG);
  const [sessionId, setSessionId] = useState(null);

  // Initialize session ID on mount
  useEffect(() => {
    const id = getOrCreateSessionId();
    setSessionId(id);
    console.info(`ChatBot session initialized: ${id}`);
  }, []);

  // Add a message to the conversation history
  const addMessage = useCallback((content, role = 'user', sources = []) => {
    const newMessage = {
      id: Date.now(),
      content,
      role,
      sources,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => {
      const updated = [...prev, newMessage];
      // Maintain max history length
      if (updated.length > config.maxHistoryLength) {
        return updated.slice(-config.maxHistoryLength);
      }
      return updated;
    });

    return newMessage;
  }, [config.maxHistoryLength]);

  // Query the chatbot and add response to history
  const ask = useCallback(async (query) => {
    if (!query || !query.trim()) {
      setError('Query cannot be empty');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Add user message
      addMessage(query, 'user');

      // Query the chatbot service with session ID
      const response = await queryChatbot(query, config.maxResults, sessionId);
      
      // Add assistant response with sources
      const assistantMessage = addMessage(
        response.answer || 'No answer available',
        'assistant',
        response.sources || []
      );

      // Log session info for debugging
      if (response.session_id) {
        console.debug(`Chatbot session: ${response.session_id}`);
      }

      return assistantMessage;
    } catch (err) {
      const errorMessage = err.message || 'Failed to get response from chatbot';
      setError(errorMessage);
      console.error('Chatbot error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [config.maxResults, sessionId, addMessage]);

  // Clear conversation history
  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
    clearSessionId();
    const newId = getOrCreateSessionId();
    setSessionId(newId);
    console.info(`Conversation history cleared. New session: ${newId}`);
  }, []);

  // Remove a specific message
  const removeMessage = useCallback((messageId) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  // Update chatbot configuration
  const updateConfig = useCallback((newConfig) => {
    setConfig(prev => ({
      ...prev,
      ...newConfig,
    }));
  }, []);

  // Get last user message
  const getLastUserMessage = useCallback(() => {
    return [...messages].reverse().find(msg => msg.role === 'user') || null;
  }, [messages]);

  // Get last assistant message
  const getLastAssistantMessage = useCallback(() => {
    return [...messages].reverse().find(msg => msg.role === 'assistant') || null;
  }, [messages]);

  // Get conversation context (last N messages)
  const getConversationContext = useCallback((count = 5) => {
    return messages.slice(-count);
  }, [messages]);

  // Check if there are unsaved changes
  const hasUnsavedMessages = messages.length > 0;

  const value = {
    // State
    messages,
    isLoading,
    error,
    config,
    hasUnsavedMessages,
    sessionId,

    // Methods
    ask,
    addMessage,
    clearHistory,
    removeMessage,
    updateConfig,

    // Getters
    getLastUserMessage,
    getLastAssistantMessage,
    getConversationContext,

    // Convenience properties
    messageCount: messages.length,
    lastMessage: messages[messages.length - 1] || null,
    userMessages: messages.filter(msg => msg.role === 'user'),
    assistantMessages: messages.filter(msg => msg.role === 'assistant'),
  };

  return (
    <ChatBotContext.Provider value={value}>
      {children}
    </ChatBotContext.Provider>
  );
};

ChatBotProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ChatBotContext;
