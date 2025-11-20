import React, { useState, useEffect } from 'react';
import MessagesList from './MessagesList';
import ChatInput from './ChatInput';
import useChatbot from '../../hooks/useChatbot';
import { useTheme, useSettings } from '../../contexts';
import './chat.css';

function makeId() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

export default function ChatContainer() {
  const { ask, loading, answer, sources, error } = useChatbot();
  const [messages, setMessages] = useState([]);
  const [waiting, setWaiting] = useState(false);
  const { theme } = useTheme();
  const { language } = useSettings();

  useEffect(() => {
    // initialize with a short system message
    setMessages([
      { id: 'm-welcome', role: 'assistant', text: 'Hi — I can help with grammar explanations and exercises. Ask me anything.', sources: [] }
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // when hook.answer changes and we're waiting, append assistant message
    if (!waiting) return;
    if (answer && answer.length > 0) {
      const assistantMessage = { id: makeId(), role: 'assistant', text: answer, sources: sources || [] };
      setMessages((m) => [...m, assistantMessage]);
      setWaiting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer]);

  const handleSend = async (text) => {
    // add user message immediately
    const userMessage = { id: makeId(), role: 'user', text, sources: [] };
    setMessages((m) => [...m, userMessage]);
    setWaiting(true);
    try {
      // pass language along if desired in future
      await ask(text);
      // assistant message will be appended in effect when `answer` updates
    } catch (e) {
      // append an error message
      setMessages((m) => [...m, { id: makeId(), role: 'assistant', text: `Error: ${e.message || e}`, sources: [] }]);
      setWaiting(false);
    }
  };

  return (
    <div className="chat-container card">
      <MessagesList messages={messages} />
      {error && <div className="chat-error">{error}</div>}
      <ChatInput onSend={handleSend} disabled={loading || waiting} />
    </div>
  );
}
