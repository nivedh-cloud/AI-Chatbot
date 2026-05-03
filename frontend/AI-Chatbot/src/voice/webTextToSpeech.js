/**
 * Browser TTS using `speechSynthesis` / `SpeechSynthesisUtterance`.
 * Picks a female voice by default when available (names differ per OS/browser).
 *
 * @param {{
 *   lang?: string,
 *   rate?: number,
 *   voicePreference?: 'female' | 'male' | 'default',
 * }} [defaults]
 * @returns {import('./contracts.js').TextToSpeechAdapter}
 */
export function createWebTextToSpeech(defaults = {}) {
  const lang = defaults.lang ?? 'en-US';
  const rate = defaults.rate ?? 1;
  const voicePreference = defaults.voicePreference ?? 'female';

  /**
   * Common vendor strings — not exhaustive; falls back to first non-male match.
   * @param {string} langNorm utterance.lang
   * @param {'female' | 'male' | 'default'} preference
   * @returns {SpeechSynthesisVoice | null}
   */
  const pickVoiceForGender = (langNorm, preference) => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const primary = langNorm.split('-')[0]?.toLowerCase() ?? 'en';
    const langMatches = voices.filter((v) =>
      v.lang.replace('_', '-').toLowerCase().startsWith(primary),
    );
    const pool = langMatches.length ? langMatches : voices;

    if (preference === 'default') return pool[0] ?? null;

    const female =
      /female|woman|\bgirl\b|zira|samantha|karen|victoria|fiona|moira|tessa|veena|joanna|ivy|kimberly|emma|nicole|linda|heather|catherine|aria|jenny|sonia|martha|natalie|\bamy\b|google uk english female|microsoft aria|siri/i;
    const male =
      /male|\bman\b|david\b|\bmark\b|daniel|fred|bruce|thomas|\bjames\b|\bjohn\b|richard|microsoft david|google uk english male|\bguy\b/i;

    if (preference === 'female') {
      const named = pool.find((v) => female.test(v.name));
      if (named) return named;
      const notMale = pool.filter((v) => !male.test(v.name));
      return notMale[0] ?? pool[0];
    }

    const named = pool.find((v) => male.test(v.name));
    return named ?? pool[0];
  };

  return {
    isSupported: () =>
      typeof window !== 'undefined' &&
      typeof window.speechSynthesis !== 'undefined' &&
      typeof SpeechSynthesisUtterance !== 'undefined',

    speak: (text, speakOptions = {}) => {
      if (!text?.trim()) return;
      window.speechSynthesis.cancel();

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        speakOptions.onEnd?.();
      };

      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.lang = speakOptions.lang ?? lang;
      utterance.rate = speakOptions.rate ?? rate;
      utterance.onend = finish;
      utterance.onerror = finish;

      const pref = speakOptions.voicePreference ?? voicePreference;

      let speakScheduled = false;
      let fallbackTimer = 0;

      utterance.onstart = () => {
        if (fallbackTimer) window.clearTimeout(fallbackTimer);
        speakOptions.onStart?.();
      };

      const applyVoiceAndSpeak = () => {
        if (speakScheduled) return;
        speakScheduled = true;
        if (fallbackTimer) window.clearTimeout(fallbackTimer);
        const voice = pickVoiceForGender(utterance.lang, pref);
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        applyVoiceAndSpeak();
      } else {
        window.speechSynthesis.addEventListener(
          'voiceschanged',
          applyVoiceAndSpeak,
          { once: true },
        );
        window.speechSynthesis.getVoices();
        fallbackTimer = window.setTimeout(() => applyVoiceAndSpeak(), 750);
      }
    },

    cancel: () => {
      window.speechSynthesis.cancel();
    },
  };
}
