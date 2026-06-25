import { motion, useScroll, useSpring } from 'framer-motion';
import { Activity } from 'lucide-react';
import { useAppMotion } from './policy';

const ambientMarks = Array.from({ length: 3 }, (_, index) => index);

export function PremiumMotionLayer() {
  const { motionEnabled, reduceMotion, setMotionPreference } = useAppMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(
    scrollYProgress,
    reduceMotion ? { stiffness: 1000, damping: 120, mass: 0.1 } : { stiffness: 140, damping: 26, mass: 0.8 },
  );

  return (
    <>
      <button
        className={`motion-control-button ${motionEnabled ? 'active' : ''}`}
        type="button"
        aria-label={motionEnabled ? 'Turn motion off' : 'Turn motion on'}
        aria-pressed={motionEnabled}
        title={motionEnabled ? 'Motion on' : 'Motion off'}
        onClick={() => setMotionPreference(motionEnabled ? 'off' : 'on')}
      >
        <Activity size={15} />
      </button>

      <motion.div className="motion-scroll-progress" style={{ scaleX: progress }} aria-hidden="true" />

      {!reduceMotion && (
        <div className="motion-ambient-field" aria-hidden="true">
          {ambientMarks.map((mark) => <span key={mark} className={`motion-ambient-mark mark-${mark + 1}`} />)}
        </div>
      )}
    </>
  );
}
