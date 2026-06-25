import { MotionConfig } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { PremiumMotionLayer } from './motion/PremiumMotionLayer';
import { MotionPreferenceProvider, useAppMotion } from './motion/policy';
import { V0App } from './v0/V0App';

const publicRoutePrefixes = ['/roles', '/login', '/signup', '/forgot-password', '/privacy', '/refund', '/terms'];

export function App() {
  return (
    <MotionPreferenceProvider>
      <MotionApp />
    </MotionPreferenceProvider>
  );
}

function MotionApp() {
  const { pathname } = useLocation();
  const showMotionLayer = !publicRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const { motionEnabled } = useAppMotion();

  return (
    <MotionConfig reducedMotion={motionEnabled ? 'never' : 'always'}>
      {showMotionLayer && <PremiumMotionLayer />}
      <V0App />
    </MotionConfig>
  );
}
