import { Capacitor } from '@capacitor/core';
import { createCapacitorSpeechToText } from './capacitorSpeechToText.js';
import { createCapacitorTextToSpeech } from './capacitorTextToSpeech.js';
import { createWebSpeechToText } from './webSpeechToText.js';
import { createWebTextToSpeech } from './webTextToSpeech.js';

export { createCapacitorSpeechToText } from './capacitorSpeechToText.js';
export { createCapacitorTextToSpeech } from './capacitorTextToSpeech.js';
export { createWebSpeechToText } from './webSpeechToText.js';
export { createWebTextToSpeech } from './webTextToSpeech.js';

/**
 * Default browser implementations. Swap for Capacitor/native adapters that expose the same ports.
 *
 * @param {{
 *   stt?: { lang?: string, continuous?: boolean, interimResults?: boolean },
 *   tts?: { lang?: string, rate?: number, voicePreference?: 'female' | 'male' | 'default' },
 * }} [options]
 * @returns {import('./contracts.js').VoiceKit}
 */
export function createBrowserVoiceKit(options = {}) {
  return {
    stt: createWebSpeechToText(options.stt),
    tts: createWebTextToSpeech(options.tts),
  };
}

/**
 * Web Speech API in browser; native speech recognition on Capacitor (Android/iOS WebView has no `SpeechRecognition`).
 *
 * @param {{
 *   stt?: { lang?: string, continuous?: boolean, interimResults?: boolean },
 *   tts?: { lang?: string, rate?: number, voicePreference?: 'female' | 'male' | 'default' },
 * }} [options]
 * @returns {import('./contracts.js').VoiceKit}
 */
export function createPlatformVoiceKit(options = {}) {
  if (Capacitor.isNativePlatform()) {
    return {
      stt: createCapacitorSpeechToText({ lang: options.stt?.lang }),
      tts: createCapacitorTextToSpeech({
        lang: options.tts?.lang,
        rate: options.tts?.rate,
      }),
    };
  }
  return createBrowserVoiceKit(options);
}
