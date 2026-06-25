import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useReducedMotion } from 'framer-motion';

export type MotionPreference = 'system' | 'on' | 'off';

export const motionStorageKey = 'estate-motion-preference';

type MotionPolicy = {
  motionPreference: MotionPreference;
  setMotionPreference: (preference: MotionPreference) => void;
  motionEnabled: boolean;
  reduceMotion: boolean;
  systemReduceMotion: boolean;
};

const MotionPolicyContext = createContext<MotionPolicy | null>(null);

export function readMotionPreference(): MotionPreference {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(motionStorageKey);
  return stored === 'on' || stored === 'off' ? stored : 'system';
}

function resolveMotionEnabled(preference: MotionPreference, systemReduceMotion: boolean) {
  if (preference === 'on') return true;
  if (preference === 'off') return false;
  return !systemReduceMotion;
}

export function MotionPreferenceProvider({ children }: { children: ReactNode }) {
  const systemReduceMotion = Boolean(useReducedMotion());
  const [motionPreference, setMotionPreferenceState] = useState<MotionPreference>(readMotionPreference);
  const motionEnabled = resolveMotionEnabled(motionPreference, systemReduceMotion);

  const setMotionPreference = useCallback((preference: MotionPreference) => {
    setMotionPreferenceState(preference);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.motion = motionEnabled ? 'on' : 'off';
  }, [motionEnabled]);

  useEffect(() => {
    window.localStorage.setItem(motionStorageKey, motionPreference);
  }, [motionPreference]);

  useEffect(() => {
    const syncPreference = (event: StorageEvent) => {
      if (event.key === motionStorageKey) {
        setMotionPreferenceState(readMotionPreference());
      }
    };

    window.addEventListener('storage', syncPreference);
    return () => window.removeEventListener('storage', syncPreference);
  }, []);

  const value = useMemo(
    () => ({
      motionPreference,
      setMotionPreference,
      motionEnabled,
      reduceMotion: !motionEnabled,
      systemReduceMotion,
    }),
    [motionEnabled, motionPreference, setMotionPreference, systemReduceMotion],
  );

  return <MotionPolicyContext.Provider value={value}>{children}</MotionPolicyContext.Provider>;
}

export function useAppMotion() {
  const context = useContext(MotionPolicyContext);
  if (!context) {
    throw new Error('useAppMotion must be used inside MotionPreferenceProvider');
  }

  return context;
}

export function useAppReducedMotion() {
  return useAppMotion().reduceMotion;
}

export function shouldUseAppMotion() {
  if (typeof document !== 'undefined') {
    const motionState = document.documentElement.dataset.motion;
    if (motionState === 'on') return true;
    if (motionState === 'off') return false;
  }

  const preference = readMotionPreference();
  if (preference === 'on') return true;
  if (preference === 'off') return false;

  return typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
