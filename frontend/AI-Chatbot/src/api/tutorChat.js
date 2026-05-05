/**
 * @param {string} apiBase
 * @param {string} message
 * @returns {Promise<string>}
 */
export async function fetchAssistantReply(apiBase, message) {
  const base = apiBase.replace(/\/$/, '');
  const url = `${base}/chat`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  } catch (err) {
    const hint = err instanceof Error ? err.message : 'Network error';
    throw new Error(
      `Cannot reach ${url}. Check backend availability and CORS allowlist for this frontend origin (${hint})`,
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = data.detail ?? res.statusText;
    const msg = typeof detail === 'string' ? detail : JSON.stringify(detail);
    if (res.status === 404) {
      throw new Error(
        `${msg} — Open the API root URL in the browser; JSON should include "voice-personal-assistant-api". If not, wrong app on that port or uvicorn not running.`,
      );
    }
    throw new Error(msg);
  }

  const reply = typeof data.reply === 'string' ? data.reply.trim() : '';
  if (!reply) {
    throw new Error('Assistant returned an empty reply. Check GEMINI_API_KEY and backend logs.');
  }

  return reply;
}
