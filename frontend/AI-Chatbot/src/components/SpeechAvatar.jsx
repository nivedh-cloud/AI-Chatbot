import { useEffect, useMemo, useState } from 'react';
import { useLottie } from 'lottie-react';

/** @typedef {'idle' | 'listening' | 'speaking'} SpeechAvatarStatus */

/**
 * Single robot animation — used only when `src/assets/images/` has no sequence frames.
 */
const ROBOT_LOTTIE_URL =
  'https://assets10.lottiefiles.com/packages/lf20_vybwn7df.json';

/** Frame files from `src/assets/images/` (sorted by path for natural order e.g. frame_001 … frame_099). */
function collectFrameEntries() {
  const globs = [
    import.meta.glob('../assets/images/*.png', { eager: true, import: 'default' }),
    import.meta.glob('../assets/images/*.jpg', { eager: true, import: 'default' }),
    import.meta.glob('../assets/images/*.jpeg', { eager: true, import: 'default' }),
    import.meta.glob('../assets/images/*.webp', { eager: true, import: 'default' }),
    import.meta.glob('../assets/images/*.gif', { eager: true, import: 'default' }),
  ];
  /** @type {Record<string, string>} */
  const merged = {};
  for (const g of globs) Object.assign(merged, g);
  return Object.entries(merged).sort(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  );
}

const FRAME_ENTRIES = collectFrameEntries();

/** Shown for idle + listening; speaking uses all other frames as a loop. */
const LISTENING_POSTURE_FILE = 'Gemini_Generated_Image_pt4cv3pt4cv3pt4c (1).png';

/**
 * @param {[string, string][]} entries
 * @returns {{ listeningUrl: string | null, speakEntries: [string, string][] }}
 */
function partitionListeningAndSpeakFrames(entries) {
  if (!entries.length) return { listeningUrl: null, speakEntries: [] };

  const normalizedTarget = LISTENING_POSTURE_FILE.toLowerCase();
  const matchIdx = entries.findIndex(([path]) => {
    const base = path.replace(/^.*[/\\]/, '').toLowerCase();
    return (
      base === normalizedTarget ||
      path.toLowerCase().endsWith(normalizedTarget)
    );
  });

  if (matchIdx >= 0) {
    const listeningUrl = entries[matchIdx][1];
    let speakEntries = entries.filter((_, i) => i !== matchIdx);
    if (speakEntries.length === 0) speakEntries = [...entries];
    return { listeningUrl, speakEntries };
  }

  const listeningUrl = entries[0][1];
  const speakEntries =
    entries.length > 1 ? entries.slice(1) : [...entries];
  return { listeningUrl, speakEntries };
}

/** Lower = each frame stays visible longer while speaking. */
const SPEAKING_ANIMATION_FPS = 7;

const { listeningUrl: LISTENING_STATIC_URL, speakEntries: SPEAK_FRAME_ENTRIES } =
  partitionListeningAndSpeakFrames(FRAME_ENTRIES);

/**
 * @param {{ animationData: object }} props
 */
function AvatarLottie({ animationData }) {
  const { View } = useLottie(
    {
      animationData,
      loop: true,
      autoplay: true,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
      },
    },
    { height: '100%', width: '100%' },
  );

  return View;
}

/**
 * Idle / listening: single posture image. Speaking: cycles `speakEntries` only.
 * @param {{ status: SpeechAvatarStatus, listeningUrl: string | null, speakEntries: [string, string][], fps?: number }} props
 */
function ImageSequenceAvatar({ status, listeningUrl, speakEntries, fps = SPEAKING_ANIMATION_FPS }) {
  const speakUrls = useMemo(
    () => speakEntries.map(([, url]) => url),
    [speakEntries],
  );

  const [index, setIndex] = useState(0);

  const isSpeaking = status === 'speaking';
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!isSpeaking) setIndex(0);
  }, [isSpeaking]);

  useEffect(() => {
    if (!isSpeaking || reduced || speakUrls.length <= 1) return;

    let raf = 0;
    let last = performance.now();

    const step = (now) => {
      raf = requestAnimationFrame(step);
      if (now - last < 1000 / fps) return;
      last = now;
      setIndex((i) => (i + 1) % speakUrls.length);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isSpeaking, reduced, speakUrls.length, fps]);

  useEffect(() => {
    const preload = (src) => {
      const img = new Image();
      img.src = src;
    };
    if (listeningUrl) preload(listeningUrl);
    speakUrls.forEach(preload);
  }, [listeningUrl, speakUrls]);

  let src = listeningUrl ?? speakUrls[0];
  if (isSpeaking && speakUrls.length > 0) {
    if (reduced || speakUrls.length === 1) src = speakUrls[0];
    else src = speakUrls[index % speakUrls.length] ?? speakUrls[0];
  }

  return (
    <div className="speech-avatar-media h-full w-full min-h-0 overflow-hidden rounded-[1.35rem]">
      <img
        src={src}
        alt=""
        className="h-full w-full min-h-0 select-none object-cover object-[center_22%]"
        draggable={false}
        decoding="async"
      />
    </div>
  );
}

/**
 * @param {object} props
 * @param {SpeechAvatarStatus} [props.status='idle']
 */
export default function SpeechAvatar({ status = 'idle' }) {
  const [animationData, setAnimationData] = useState(null);
  const [loading, setLoading] = useState(true);

  const useLocalFrames = FRAME_ENTRIES.length > 0;

  useEffect(() => {
    if (useLocalFrames) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(ROBOT_LOTTIE_URL);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!cancelled) setAnimationData(data);
      } catch {
        if (!cancelled) setAnimationData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [useLocalFrames]);

  const listeningPulse = status === 'listening';
  const speakingGlow = status === 'speaking';

  const label =
    status === 'speaking'
      ? 'Assistant is speaking'
      : status === 'listening'
        ? 'Listening'
        : 'Idle';

  const frameClasses = [
    'relative rounded-[2.25rem] p-[3px]',
    'bg-gradient-to-br from-teal-400/45 via-slate-500/25 to-violet-500/35',
    listeningPulse && 'shadow-[0_0_48px_-12px_rgba(45,212,191,0.45)]',
    speakingGlow &&
      !listeningPulse &&
      'shadow-[0_0_44px_-10px_rgba(167,139,250,0.38)]',
    !listeningPulse && !speakingGlow && 'shadow-[0_24px_48px_-28px_rgba(0,0,0,0.85)]',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex w-full flex-col items-center justify-center px-1">
      <span className="sr-only" aria-live="polite">
        {label}
      </span>

      <div className={frameClasses}>
        <div
          className={[
            'relative flex items-center justify-center overflow-hidden rounded-[2.05rem]',
            'bg-gradient-to-b from-slate-900/95 to-slate-950',
            'ring-1 ring-white/[0.06]',
            'w-[min(72vw,248px)] h-[min(72vw,248px)] sm:w-[min(56vw,268px)] sm:h-[min(56vw,268px)]',
          ].join(' ')}
          aria-hidden
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(45,212,191,0.08),transparent_55%)]" />

          <div className="relative grid h-[94%] w-[94%] max-h-[228px] max-w-[228px] min-h-0 grid-cols-1 grid-rows-1 overflow-hidden rounded-[1.35rem] [&>*]:col-start-1 [&>*]:row-start-1 [&>*]:min-h-0 [&>*]:h-full [&>*]:w-full">
            {useLocalFrames ? (
              <ImageSequenceAvatar
                status={status}
                listeningUrl={LISTENING_STATIC_URL}
                speakEntries={SPEAK_FRAME_ENTRIES}
              />
            ) : loading && !animationData ? (
              <div
                className="h-[84%] w-[84%] rounded-[1.35rem] bg-gradient-to-br from-slate-800/90 to-slate-900"
                aria-hidden
              />
            ) : animationData ? (
              <AvatarLottie animationData={animationData} />
            ) : (
              <div className="px-5 text-center text-xs leading-relaxed text-slate-500">
                Add PNG/WebP/JPEG frames to{' '}
                <code className="text-slate-400">src/assets/images</code> — or set{' '}
                <code className="text-slate-400">ROBOT_LOTTIE_URL</code>.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
