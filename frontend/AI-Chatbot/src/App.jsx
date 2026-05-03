import { Capacitor } from '@capacitor/core';
import { useMemo } from 'react';
import MicIcon from './components/MicIcon.jsx';
import SpeechAvatar from './components/SpeechAvatar.jsx';
import { useVoiceTutorSession } from './hooks/useVoiceTutorSession.js';
import { createBrowserVoiceKit } from './voice/index.js';

const raw = import.meta.env.VITE_API_URL;
/** Always talk to FastAPI directly — posting to :5173/chat only works if Vite proxy is active (fragile). */
const API_BASE =
  typeof raw === 'string' && raw.trim() !== ''
    ? raw.trim().replace(/\/$/, '')
    : 'http://127.0.0.1:8001';

function warnIfAndroidUsesLoopbackApi() {
  if (!import.meta.env.PROD || !Capacitor.isNativePlatform()) return;
  try {
    const { hostname } = new URL(API_BASE);
    if (hostname === '127.0.0.1' || hostname === 'localhost') {
      console.warn(
        '[Voice Assistant] API URL is localhost — unreachable from the device. Set VITE_API_URL (e.g. http://10.0.2.2:8001 for emulator, or your PC LAN IP for a phone).',
      );
    }
  } catch {
    /* ignore */
  }
}
warnIfAndroidUsesLoopbackApi();

export default function App() {
  const voiceKit = useMemo(() => createBrowserVoiceKit(), []);

  const {
    supported,
    listening,
    busy,
    status,
    liveTranscript,
    lastYou,
    lastAssistantReply,
    toggleMic,
    speaking,
    cancelAssistantSpeech,
  } = useVoiceTutorSession(API_BASE, voiceKit);

  const avatarStatus = listening ? 'listening' : speaking ? 'speaking' : 'idle';
  const micDisabled = !supported || busy;
  const showCard = Boolean(liveTranscript || lastYou || lastAssistantReply);

  return (
    <div className="relative isolate min-h-[100dvh] w-full overflow-hidden bg-slate-950">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-30%,rgba(45,212,191,0.18),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-teal-500/15 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-32 h-80 w-80 rounded-full bg-violet-600/12 blur-[110px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-px w-[min(100%,42rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-teal-500/25 to-transparent"
        aria-hidden
      />

      <div
        className={[
          'relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col gap-5 px-5',
          'pt-[max(1.25rem,env(safe-area-inset-top))]',
          'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
        ].join(' ')}
      >
        <header className="shrink-0 space-y-4 pt-1 text-center sm:text-left">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-between">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-300/95 shadow-sm shadow-black/20 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.9)]" />
              Voice-first
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-3xl font-bold leading-tight tracking-tight text-transparent sm:text-[2rem]">
              Personal Assistant
            </h1>
            <p className="mx-auto max-w-md text-sm font-medium text-slate-400 sm:mx-0">
              Voice-first help — and gentle English tips when something could sound smoother.
            </p>
          </div>

          <div
            className={[
              'rounded-2xl border px-4 py-3 text-left text-sm leading-relaxed backdrop-blur-md',
              listening
                ? 'border-teal-500/25 bg-teal-950/30 text-teal-50/95 shadow-glow'
                : speaking
                  ? 'border-violet-500/20 bg-violet-950/25 text-violet-50/95'
                  : busy
                    ? 'border-amber-500/15 bg-amber-950/20 text-amber-50/90'
                    : 'border-white/[0.06] bg-slate-950/40 text-slate-300',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <span
                className={[
                  'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                  listening && 'bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.8)]',
                  !listening && speaking && 'bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.7)]',
                  !listening && !speaking && busy && 'bg-amber-400',
                  !listening && !speaking && !busy && 'bg-slate-500',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden
              />
              <p>{status}</p>
            </div>
          </div>
        </header>

        <div className="flex shrink-0 justify-center">
          <SpeechAvatar status={avatarStatus} />
        </div>

        <section className="flex min-h-0 flex-1 flex-col gap-3">
          {showCard ? (
            <div
              className={[
                'flex min-h-[128px] flex-1 flex-col overflow-hidden rounded-3xl',
                'border border-white/[0.08] bg-slate-950/45 shadow-[0_25px_50px_-25px_rgba(0,0,0,0.65)] backdrop-blur-xl',
              ].join(' ')}
            >
              <div className="border-b border-white/[0.06] bg-gradient-to-r from-white/[0.03] to-transparent px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Conversation
                </p>
              </div>
              <div className="max-h-[42vh] flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:max-h-[48vh]">
                {liveTranscript ? (
                  <div className="space-y-2 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400/90">
                      You · listening
                    </p>
                    <p className="text-[15px] leading-relaxed text-slate-100">{liveTranscript}</p>
                  </div>
                ) : null}
                {!listening && lastYou ? (
                  <div className="space-y-2 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      You · sent
                    </p>
                    <p className="text-[15px] leading-relaxed text-slate-200">{lastYou}</p>
                  </div>
                ) : null}
                {lastAssistantReply ? (
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-950/50 to-slate-900/80 p-4 ring-1 ring-teal-500/15">
                    <div className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-teal-400 to-cyan-500 opacity-80" />
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-teal-300/95">
                      Assistant
                    </p>
                    <p className="pl-2 text-[15px] leading-relaxed text-slate-50">{lastAssistantReply}</p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[100px] flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-white/[0.1] bg-gradient-to-b from-white/[0.02] to-transparent px-6 py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 ring-1 ring-teal-500/20">
                <MicIcon className="h-7 w-7 text-teal-400/90" />
              </div>
              <p className="max-w-[260px] text-sm leading-relaxed text-slate-500">
                Tap the mic below and speak. Transcripts from each turn land here — no typing needed.
              </p>
            </div>
          )}
        </section>

        <footer className="flex shrink-0 flex-col items-center gap-5">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={toggleMic}
              disabled={micDisabled}
              aria-pressed={listening}
              className={[
                'relative flex h-[118px] w-[118px] sm:h-[132px] sm:w-[132px]',
                'touch-manipulation select-none items-center justify-center rounded-full',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-300/80',
                listening
                  ? 'bg-gradient-to-br from-rose-500 to-orange-600 shadow-glow-rose ring-[3px] ring-white/15'
                  : 'bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600 shadow-[0_20px_40px_-15px_rgba(45,212,191,0.45)] ring-[3px] ring-white/10',
                micDisabled && 'pointer-events-none opacity-40 saturate-50',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="sr-only">{listening ? 'Stop listening' : 'Start listening'}</span>
              <MicIcon className="relative z-[1] h-[52px] w-[52px] text-white drop-shadow-md" />
            </button>

            {lastAssistantReply ? (
              <button
                type="button"
                onClick={cancelAssistantSpeech}
                className={[
                  'min-h-[48px] rounded-full border border-white/[0.12] bg-white/[0.06] px-6 text-sm font-semibold text-slate-100',
                  'backdrop-blur-sm hover:bg-white/[0.1]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300/70',
                ].join(' ')}
              >
                Stop playback
              </button>
            ) : null}
          </div>

          <div className="w-full rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-3 backdrop-blur-sm">
            <p className="text-center text-[11px] leading-relaxed text-slate-500">
              Modular voice stack{' '}
              <code className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                src/voice
              </code>
              <span className="mx-1 text-slate-600">·</span>
              API{' '}
              <code className="break-all rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                {API_BASE}
              </code>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
