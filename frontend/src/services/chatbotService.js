import { API_BASE_URL, API_ENDPOINTS } from '../constants';

const base = process.env.REACT_APP_API_BASE_URL || API_BASE_URL || 'http://localhost:8000';

export async function queryChatbot(query, max_results = 5) {
  const url = `${base}${API_ENDPOINTS.chatbot}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, max_results })
  });

  const data = await res.json();
  if (!res.ok) {
    const err = data.detail || (data.error || 'Server error');
    throw new Error(err);
  }
  return data;
}

export default { queryChatbot };
