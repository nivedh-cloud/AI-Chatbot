/**
 * Native STT via @capacitor-community/speech-recognition (Android / iOS WebView has no Web Speech API).
 * @param {{ lang?: string }} [options]
 * @returns {import('./contracts.js').SpeechToTextAdapter}
 */
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

/** Android plugin `stop()` often never resolves (missing call.resolve); don't hang forever. */
function stopRecognitionWithTimeout(ms = 600) {
  return Promise.race([
    SpeechRecognition.stop().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, ms)),
  ]);
}

export function createCapacitorSpeechToText(options = {}) {
  const lang = options.lang ?? 'en-US';
  let callbacks = null;
  let latestSnapshot = '';
  let sessionId = 0;

  return {
    isSupported: () => true,

    startSession: (cb) => {
      callbacks = cb;
      latestSnapshot = '';
      const myId = ++sessionId;

      void (async () => {
        try {
          const perm = await SpeechRecognition.requestPermissions();
          if (myId !== sessionId) return;
          if (perm.speechRecognition !== 'granted') {
            callbacks?.onError?.({
              code: 'permission_denied',
              message: 'Microphone permission was denied. Enable it in Settings → Apps.',
            });
            return;
          }

          const { available } = await SpeechRecognition.available();
          if (myId !== sessionId) return;
          if (!available) {
            callbacks?.onError?.({
              code: 'unavailable',
              message: 'Speech recognition is not available on this device.',
            });
            return;
          }

          await SpeechRecognition.removeAllListeners();
          if (myId !== sessionId) return;

          await SpeechRecognition.addListener('partialResults', (data) => {
            if (myId !== sessionId) return;
            const parts = data.matches;
            const text = Array.isArray(parts) && parts.length ? parts.join(' ') : '';
            latestSnapshot = text.trim();
            callbacks?.onTranscript?.({
              committedText: latestSnapshot,
              previewText: '',
              displayText: latestSnapshot,
            });
          });

          // popup: false + partialResults: true → inline recognition (partial events work on Android).
          await SpeechRecognition.start({
            language: lang,
            partialResults: true,
            popup: false,
            maxResults: 5,
          });

          if (myId !== sessionId) {
            await stopRecognitionWithTimeout();
            try {
              await SpeechRecognition.removeAllListeners();
            } catch {
              /* ignore */
            }
            return;
          }

          // Mic turns red as soon as native listening starts (not only after onBeginningOfSpeech).
          callbacks?.onSessionStart?.();
        } catch (err) {
          if (myId !== sessionId) return;
          callbacks?.onError?.({
            code: 'start_failed',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      })();
    },

    stopSession: () => {
      sessionId += 1;
      void (async () => {
        await stopRecognitionWithTimeout();
        try {
          await SpeechRecognition.removeAllListeners();
        } catch {
          /* ignore */
        }
        const transcript = latestSnapshot.trim();
        latestSnapshot = '';
        const cb = callbacks;
        callbacks = null;
        cb?.onSessionEnd?.({ transcript });
      })();
    },

    dispose: () => {
      sessionId += 1;
      void (async () => {
        await stopRecognitionWithTimeout();
        try {
          await SpeechRecognition.removeAllListeners();
        } catch {
          /* ignore */
        }
      })();
      callbacks = null;
      latestSnapshot = '';
    },
  };
}
