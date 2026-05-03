/**
 * Voice I/O contracts for swapping Web Speech API with Capacitor plugins.
 * Implement the same shapes in e.g. `capacitorSpeechToText.js` / `capacitorTextToSpeech.js`.
 */

/**
 * @typedef {{ committedText: string, previewText: string, displayText: string }} SttTranscriptPayload
 */

/**
 * @typedef {{ code: string, message: string }} SttErrorPayload
 */

/**
 * @typedef {{
 *   onSessionStart?: () => void,
 *   onTranscript?: (payload: SttTranscriptPayload) => void,
 *   onError?: (payload: SttErrorPayload) => void,
 *   onSessionEnd?: (payload: { transcript: string }) => void,
 * }} SttSessionCallbacks
 */

/**
 * Speech-to-text session controller (browser Web Speech API, Capacitor Speech Recognition, etc.).
 *
 * @typedef {Object} SpeechToTextAdapter
 * @property {() => boolean} isSupported
 * @property {(callbacks: SttSessionCallbacks) => void} startSession
 * @property {() => void} stopSession
 * @property {() => void} dispose
 */

/**
 * @typedef {{
 *   lang?: string,
 *   rate?: number,
 *   voicePreference?: 'female' | 'male' | 'default',
 *   onStart?: () => void,
 *   onEnd?: () => void,
 * }} TtsSpeakOptions
 */

/**
 * Text-to-speech adapter (browser speechSynthesis, Capacitor Text-to-Speech, native audio, etc.).
 *
 * @typedef {Object} TextToSpeechAdapter
 * @property {() => boolean} isSupported
 * @property {(text: string, options?: TtsSpeakOptions) => void} speak
 * @property {() => void} cancel
 */

/**
 * @typedef {{ stt: SpeechToTextAdapter, tts: TextToSpeechAdapter }} VoiceKit
 */

export {};
