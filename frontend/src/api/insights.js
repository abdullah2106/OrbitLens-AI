import client from './client';

export async function generateInsights(sessionId) {
  const response = await client.post('/insights', { session_id: sessionId });
  return response.data;
}
