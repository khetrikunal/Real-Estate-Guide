import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8');

const checks = [
  {
    file: 'src/App.tsx',
    patterns: [/PremiumMotionLayer/, /<PremiumMotionLayer /],
  },
  {
    file: 'src/motion/PremiumMotionLayer.tsx',
    patterns: [
      /motion-control-button/,
      /aria-pressed/,
      /motion-scroll-progress/,
      /motion-ambient-field/,
      /useAppMotion/,
    ],
  },
  {
    file: 'src/motion/policy.tsx',
    patterns: [
      /estate-motion-preference/,
      /document\.documentElement\.dataset\.motion/,
      /useReducedMotion/,
      /shouldUseAppMotion/,
    ],
  },
  {
    file: 'src/motion/presets.ts',
    patterns: [/heroReveal/, /textReveal/, /scrollReveal/, /hoverLift/, /modalBlur/],
  },
  {
    file: 'src/styles/design-system.css',
    patterns: [
      /data-motion="on"/,
      /data-motion="off"/,
      /motion-control-button/,
      /motionIntroMask/,
      /motionTextReveal/,
      /motionMarquee/,
      /motionTicker/,
      /motionParallaxDrift/,
      /motionImageMask/,
      /motionSvgDraw/,
      /motionParticleFloat/,
      /motionGradientSweep/,
      /motionConfetti/,
      /motionMapPulse/,
      /motionChartDraw/,
      /motionStoryPin/,
      /prefers-reduced-motion:\s*reduce/,
    ],
  },
];

const failures = [];

for (const check of checks) {
  const fullPath = join(root, check.file);
  if (!existsSync(fullPath)) {
    failures.push(`${check.file}: missing file`);
    continue;
  }

  const content = read(check.file);
  for (const pattern of check.patterns) {
    if (!pattern.test(content)) {
      failures.push(`${check.file}: missing ${pattern}`);
    }
  }
}

if (failures.length) {
  console.error(`Premium motion verification failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Premium motion verification passed');
