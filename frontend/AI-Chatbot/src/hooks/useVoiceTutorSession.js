import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAssistantReply } from '../api/tutorChat.js';

/**
 * Orchestrates STT → `/chat` → TTS using injectable voice adapters (browser now, Capacitor later).
 *
 * @param {string} apiBase
 * @param {import('../voice/contracts.js').VoiceKit} voiceKit
 */
export function useVoiceTutorSession(apiBase, voiceKit) {
  const kitRef = useRef(voiceKit);
  kitRef.current = voiceKit;

  const listeningRef = useRef(false);
  const pendingStartRef = useRef(false);

  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(() => voiceKit.stt.isSupported());
  const [status, setStatus] = useState(
    'Tap the microphone, speak, then tap again when you are done.',
  );
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastYou, setLastYou] = useState('');
  const [lastAssistantReply, setLastAssistantReply] = useState('');
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const ok = voiceKit.stt.isSupported();
    setSupported(ok);
    setStatus(
      ok
        ? 'Tap the microphone, speak, then tap again when you are done.'
        : 'Speech recognition is not supported on this device. Try Chrome or Edge, or use the native app.',
    );
  }, [voiceKit]);

  useEffect(() => {
    return () => {
      voiceKit.stt.dispose();
      voiceKit.tts.cancel();
    };
  }, [voiceKit]);

  const toggleMic = useCallback(() => {
    const kit = kitRef.current;
    if (!kit.stt.isSupported() || busy) return;

    if (listeningRef.current) {
      kit.stt.stopSession();
      return;
    }

    if (pendingStartRef.current) {
      pendingStartRef.current = false;
      kit.stt.stopSession();
      return;
    }

    pendingStartRef.current = true;

    kit.stt.startSession({
      onSessionStart: () => {
        pendingStartRef.current = false;
        listeningRef.current = true;
        setListening(true);
        setLiveTranscript('');
        setStatus('Listening… Tap the mic again when you finish.');
      },
      onTranscript: ({ displayText }) => {
        setLiveTranscript(displayText);
      },
      onError: ({ message }) => {
        pendingStartRef.current = false;
        listeningRef.current = false;
        setListening(false);
        setLiveTranscript('');
        setStatus(`Speech recognition error: ${message}. Try again.`);
      },
      onSessionEnd: async ({ transcript }) => {
        pendingStartRef.current = false;
        listeningRef.current = false;
        setListening(false);
        setLiveTranscript('');
        const said = transcript.trim();
        if (!said) {
          setStatus(
            'No text was sent — speak, wait until words appear, then tap the mic again to stop. Or check that the Python API is running.',
          );
          return;
        }

        setLastYou(said);
        setBusy(true);
        setStatus('Thinking…');

        try {
          const reply = await fetchAssistantReply(apiBase, said);
          setLastAssistantReply(reply);
          kitRef.current.tts.speak(reply, {
            onStart: () => setSpeaking(true),
            onEnd: () => setSpeaking(false),
          });
          setStatus('Tap the microphone to continue.');
        } catch (err) {
          setStatus(err instanceof Error ? err.message : 'Request failed.');
        } finally {
          setBusy(false);
        }
      },
    });
  }, [apiBase, busy]);

  return {
    supported,
    listening,
    busy,
    status,
    liveTranscript,
    lastYou,
    lastAssistantReply,
    toggleMic,
    speaking,
    cancelAssistantSpeech: () => {
      kitRef.current.tts.cancel();
      setSpeaking(false);
    },
  };
}
