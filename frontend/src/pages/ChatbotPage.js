import React from 'react';
import './ChatbotPage.css';
import ChatContainer from '../components/chat/ChatContainer';

export default function ChatbotPage() {
  return (
    <div className="chatbot-container">
      <div className="chatbot-card">
        <h2>Grammar Chatbot</h2>
        <p className="chatbot-sub">Ask grammar questions or request exercises. Sources are from the indexed learning materials.</p>
        <ChatContainer />
      </div>
    </div>
  );
}
