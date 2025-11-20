import { useState } from 'react';
import chatbotService from '../services/chatbotService';

export default function useChatbot() {
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [error, setError] = useState(null);

  async function ask(query) {
    setLoading(true);
    setError(null);
    setAnswer('');
    setSources([]);
    try {
      const data = await chatbotService.queryChatbot(query, 5);
      setAnswer(data.answer || 'No answer');
      setSources(data.sources || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return { ask, loading, answer, sources, error };
}
