import { Children, isValidElement, type ComponentPropsWithoutRef, type Key, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAppReducedMotion } from './policy';
import { cappedStagger, instantTransition, motionEase, motionSpring, stagger } from './presets';

type DivMotionProps = Omit<ComponentPropsWithoutRef<typeof motion.div>, 'children'>;
type SectionMotionProps = Omit<ComponentPropsWithoutRef<typeof motion.section>, 'children'>;

export type MotionPrimitiveProps = DivMotionProps & {
  children: ReactNode;
};

export type RevealSectionProps = SectionMotionProps & {
  children: ReactNode;
};

function childKey(child: ReactNode, index: number) {
  return isValidElement(child) && child.key != null ? child.key : index;
}

export function RouteTransition({ children, className, ...props }: MotionPrimitiveProps) {
  const location = useLocation();
  const reduceMotion = useAppReducedMotion();
  const transition = reduceMotion ? instantTransition : { duration: 0.22, ease: motionEase.entrance };

  return (
    <AnimatePresence mode="wait" initial={!reduceMotion}>
      <motion.div
        key={location.pathname}
        className={className}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 1 } : { opacity: 0.6, y: -4 }}
        transition={transition}
        {...props}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function RevealSection({
  children,
  viewport: _viewport = { once: true, margin: '-80px' },
  transition,
  ...props
}: RevealSectionProps) {
  const reduceMotion = useAppReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? instantTransition : transition ?? { duration: 0.22, ease: motionEase.entrance }}
      {...props}
    >
      {children}
    </motion.section>
  );
}

export function OperationalKpiGroup({ children, ...props }: MotionPrimitiveProps) {
  const reduceMotion = useAppReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : 'initial'}
      animate="animate"
      variants={{
        initial: {},
        animate: {
          transition: reduceMotion ? instantTransition : { staggerChildren: stagger.grid, delayChildren: 0.02 },
        },
      }}
      {...props}
    >
      {Children.map(children, (child, index) => (
        <motion.div
          key={childKey(child, index)}
          variants={{
            initial: { opacity: 0, y: 10 },
            animate: {
              opacity: 1,
              y: 0,
              transition: reduceMotion
                ? instantTransition
                : { duration: 0.2, ease: motionEase.entrance, delay: cappedStagger(index, stagger.grid) },
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

export function AnimatedRows({ children, ...props }: MotionPrimitiveProps) {
  const reduceMotion = useAppReducedMotion();

  return (
    <motion.div initial={reduceMotion ? false : 'initial'} animate="animate" {...props}>
      {Children.map(children, (child, index) => (
        <motion.div
          key={childKey(child, index)}
          variants={{
            initial: { opacity: 0, y: 8 },
            animate: {
              opacity: 1,
              y: 0,
              transition: reduceMotion
                ? instantTransition
                : { duration: 0.18, ease: motionEase.entrance, delay: cappedStagger(index, stagger.list) },
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

export function PanelTransition({
  children,
  motionKey,
  className,
  ...props
}: MotionPrimitiveProps & { motionKey?: Key }) {
  const reduceMotion = useAppReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={!reduceMotion}>
      <motion.div
        key={motionKey ?? 'panel'}
        className={className}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14, scale: 0.996 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8, scale: 0.998 }}
        transition={reduceMotion ? instantTransition : motionSpring.panel}
        {...props}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
