import React from 'react';
import PropTypes from 'prop-types';

export default function MessagesItem({ message }) {
  const isUser = message.role === 'user';
  const wrapperClass = `chat-message-item ${isUser ? 'user' : 'assistant'}`;

  return (
    <div className={wrapperClass}>
      <div className="chat-message-bubble">
        <div className="chat-message-text">{message.text}</div>
        {message.sources && message.sources.length > 0 && (
          <div className="chat-message-sources">
            Sources: {message.sources.map((s, i) => (<span key={i}>{s.slice(0,80)}{i < message.sources.length-1 ? ' | ' : ''}</span>))}
          </div>
        )}
      </div>
    </div>
  );
}

MessagesItem.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string,
    role: PropTypes.oneOf(['user', 'assistant']),
    text: PropTypes.string,
    sources: PropTypes.array
  }).isRequired
};
