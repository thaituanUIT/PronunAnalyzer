import { API_BASE_URL, API_ENDPOINTS } from '../constants';

const base = process.env.REACT_APP_API_BASE_URL || API_BASE_URL || 'http://localhost:8000';

// Generate a unique session ID for the current user session
let currentSessionId = null;

export function getOrCreateSessionId() {
  if (!currentSessionId) {
    // Generate a unique session ID based on timestamp and random value
    currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Store in sessionStorage for persistence across page reloads in same tab
    sessionStorage.setItem('chatbot_session_id', currentSessionId);
  }
  return currentSessionId;
}

export function setSessionId(sessionId) {
  currentSessionId = sessionId;
  sessionStorage.setItem('chatbot_session_id', sessionId);
}

export function clearSessionId() {
  currentSessionId = null;
  sessionStorage.removeItem('chatbot_session_id');
}

export async function queryChatbot(query, max_results = 5, sessionId = null) {
  const url = `${base}${API_ENDPOINTS.chatbot}/query`;
  const session = sessionId || getOrCreateSessionId();
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      query, 
      max_results,
      session_id: session
    })
  });

  const data = await res.json();
  if (!res.ok) {
    const err = data.detail || (data.error || 'Server error');
    throw new Error(err);
  }
  
  // Update session ID if returned by server
  if (data.session_id) {
    setSessionId(data.session_id);
  }
  
  return {
    ...data,
    session_id: session
  };
}

export default { 
  queryChatbot, 
  getOrCreateSessionId, 
  setSessionId, 
  clearSessionId 
};
