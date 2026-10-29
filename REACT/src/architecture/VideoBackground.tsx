import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useAppMotion } from '../motion/policy';

/** Locally hosted architectural footage, with a still image when motion is disabled. */
export function VideoBackground({ workspace = false }: { workspace?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const { reduceMotion } = useAppMotion();
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  const enabled = !reduceMotion && !saveData && !failed;

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (!enabled || paused || hidden) { element.pause(); return; }
    element.muted = true;
    element.play().catch(() => setPaused(true));
  }, [enabled, paused, hidden]);

  return <>
    <div className={`estate-video-background ${workspace ? 'estate-video-background--workspace' : ''}`} aria-hidden="true">
      <div className="estate-video-background__poster" />
      {enabled && <video ref={video} className={ready ? 'is-ready' : ''} autoPlay muted loop playsInline preload="metadata"
        poster="/media/architecture-background.jpg" tabIndex={-1} onPlaying={() => setReady(true)} onError={() => setFailed(true)}>
        <source src="/media/architecture-background.mp4" type="video/mp4" />
      </video>}
      <div className="estate-video-background__tint" />
    </div>
    {enabled && <button type="button" className="estate-video-control" aria-label={paused ? 'Play background video' : 'Pause background video'} aria-pressed={!paused} onClick={() => setPaused(!paused)}>
      {paused ? <Play size={12} /> : <Pause size={12} />} <span>Background film</span>
    </button>}
  </>;
}
