import React, { useState } from 'react';
import PropTypes from 'prop-types';

export default function ChatInput({ onSend, disabled = false }) {
  const [value, setValue] = useState('');

  const handleSend = async () => {
    const v = value.trim();
    if (!v) return;
    setValue('');
    try {
      await onSend(v);
    } catch (e) {
      // swallow - parent handles errors
      console.error(e);
    }
  };

  return (
    <div className="chat-input-row">
      <input
        className="chat-input"
        placeholder="Ask a grammar question..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
        disabled={disabled}
      />
      <button
        className="chat-send-button"
        onClick={handleSend}
        disabled={disabled}
      >
        Send
      </button>
    </div>
  );
}

ChatInput.propTypes = {
  onSend: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};
