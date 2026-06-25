import { useLocation, useNavigate } from 'react-router-dom';

export function usePathname() {
  return useLocation().pathname;
}

export function useRouter() {
  const navigate = useNavigate();

  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh: () => undefined,
  };
}

export function redirect(href: string): never {
  window.location.assign(href);
  throw new Error(`Redirected to ${href}`);
}

export function notFound(): never {
  throw new Error('Not found');
}
