import { useCallback } from 'react';
import { type NavigateOptions, type To, useNavigate } from 'react-router-dom';
import { shouldUseAppMotion } from './policy';

type ViewTransitionController = {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => ViewTransitionController;
};

export function getPropertyViewTransitionName(id: string | number) {
  return `property-${id}`;
}

export function startViewTransitionNavigation(callback: () => void) {
  if (typeof document === 'undefined' || !shouldUseAppMotion()) {
    callback();
    return undefined;
  }

  const viewTransitionDocument = document as ViewTransitionDocument;
  if (!viewTransitionDocument.startViewTransition) {
    callback();
    return undefined;
  }

  return viewTransitionDocument.startViewTransition(callback);
}

export function useViewTransitionNavigate() {
  const navigate = useNavigate();

  return useCallback(
    (to: To | number, options?: NavigateOptions) => startViewTransitionNavigation(() => {
      if (typeof to === 'number') {
        navigate(to);
        return;
      }

      navigate(to, options);
    }),
    [navigate],
  );
}
