/**
 * Browser STT using Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`).
 * @param {{ lang?: string, continuous?: boolean, interimResults?: boolean }} [options]
 * @returns {import('./contracts.js').SpeechToTextAdapter}
 */
export function createWebSpeechToText(options = {}) {
  const lang = options.lang ?? 'en-US';
  const continuous = options.continuous ?? true;
  const interimResults = options.interimResults ?? true;

  let recognition = null;
  let committed = '';
  /** Full caption (final + interim) so stopping mid-phrase still sends text to the API. */
  let latestSnapshot = '';
  /** @type {import('./contracts.js').SttSessionCallbacks | null} */
  let callbacks = null;

  function getCtor() {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
  }

  function detachRecognition() {
    if (!recognition) return;
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition = null;
  }

  return {
    isSupported: () => Boolean(getCtor()),

    startSession: (cb) => {
      callbacks = cb;
      committed = '';
      latestSnapshot = '';
      const Ctor = getCtor();
      if (!Ctor) {
        callbacks?.onError?.({
          code: 'unsupported',
          message: 'Speech recognition is not available in this environment.',
        });
        return;
      }

      detachRecognition();
      const rec = new Ctor();
      rec.lang = lang;
      rec.continuous = continuous;
      rec.interimResults = interimResults;

      rec.onstart = () => {
        callbacks?.onSessionStart?.();
      };

      rec.onresult = (event) => {
        let interim = '';
        let finals = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const chunk = event.results[i][0]?.transcript ?? '';
          if (event.results[i].isFinal) {
            finals += chunk;
          } else {
            interim += chunk;
          }
        }
        if (finals) {
          committed += finals;
        }
        latestSnapshot = `${committed}${interim}`.trim();
        const displayText = latestSnapshot;
        callbacks?.onTranscript?.({
          committedText: committed,
          previewText: interim,
          displayText,
        });
      };

      rec.onerror = (event) => {
        if (event.error === 'aborted') return;
        callbacks?.onError?.({
          code: String(event.error),
          message: String(event.error),
        });
      };

      rec.onend = () => {
        const transcript = latestSnapshot.trim() || committed.trim();
        committed = '';
        latestSnapshot = '';
        detachRecognition();
        callbacks?.onSessionEnd?.({ transcript });
      };

      recognition = rec;

      try {
        rec.start();
      } catch (err) {
        detachRecognition();
        callbacks?.onError?.({
          code: 'start_failed',
          message: err instanceof Error ? err.message : 'Could not start listening.',
        });
      }
    },

    stopSession: () => {
      if (!recognition) return;
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    },

    dispose: () => {
      if (!recognition) return;
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
      detachRecognition();
      callbacks = null;
      committed = '';
      latestSnapshot = '';
    },
  };
}
