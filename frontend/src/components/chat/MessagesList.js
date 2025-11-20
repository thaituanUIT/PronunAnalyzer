import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import MessagesItem from './MessagesItem';

export default function MessagesList({ messages }) {
  const listRef = useRef(null);

  useEffect(() => {
    // scroll to bottom when messages change
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={listRef} className="chat-messages-list">
      {messages.map((m) => (
        <MessagesItem key={m.id} message={m} />
      ))}
    </div>
  );
}

MessagesList.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.object).isRequired
};
