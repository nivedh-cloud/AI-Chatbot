/**
 * Native TTS via @capacitor-community/text-to-speech (Android/iOS WebView often has no `speechSynthesis`).
 * @param {{ lang?: string, rate?: number }} [defaults]
 * @returns {import('./contracts.js').TextToSpeechAdapter}
 */
import { TextToSpeech } from '@capacitor-community/text-to-speech';

export function createCapacitorTextToSpeech(defaults = {}) {
  const lang = defaults.lang ?? 'en-US';
  const rate = defaults.rate ?? 1;

  return {
    isSupported: () => true,

    speak: (text, speakOptions = {}) => {
      const trimmed = text?.trim();
      if (!trimmed) return;

      void (async () => {
        try {
          await TextToSpeech.stop().catch(() => {});
          speakOptions.onStart?.();
          await TextToSpeech.speak({
            text: trimmed,
            lang: speakOptions.lang ?? lang,
            rate: speakOptions.rate ?? rate,
          });
        } catch {
          /* synthesis unavailable or interrupted */
        } finally {
          speakOptions.onEnd?.();
        }
      })();
    },

    cancel: () => {
      void TextToSpeech.stop().catch(() => {});
    },
  };
}
