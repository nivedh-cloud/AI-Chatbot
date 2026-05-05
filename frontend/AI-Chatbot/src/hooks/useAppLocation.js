import { Geolocation } from '@capacitor/geolocation';
import { useEffect, useState } from 'react';

/**
 * Requests location permission once and reads a single coarse fix (for region / availability checks).
 * @returns {{ phase: 'idle' | 'loading' | 'ready', permission: 'unknown' | 'granted' | 'denied', message: string }}
 */
export function useAppLocation() {
  const [state, setState] = useState({
    phase: 'loading',
    permission: 'unknown',
    message: 'Checking location access…',
  });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const checked = await Geolocation.checkPermissions();
        if (cancelled) return;

        let loc = checked.location;
        if (loc === 'prompt' || loc === 'prompt-with-rationale') {
          const req = await Geolocation.requestPermissions();
          if (cancelled) return;
          loc = req.location;
        }

        if (loc !== 'granted') {
          setState({
            phase: 'ready',
            permission: 'denied',
            message: 'Location off — region check skipped.',
          });
          return;
        }

        await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 300_000,
        });

        if (cancelled) return;
        setState({
          phase: 'ready',
          permission: 'granted',
          message: 'Location on — region check ok.',
        });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setState({
          phase: 'ready',
          permission: 'denied',
          message: `Location unavailable (${msg}).`,
        });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
