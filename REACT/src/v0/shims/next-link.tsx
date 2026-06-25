import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

type NextLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  children?: ReactNode;
};

const Link = forwardRef<HTMLAnchorElement, NextLinkProps>(({ href, children, ...props }, ref) => {
  if (href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return (
      <a ref={ref} href={href} {...props}>
        {children}
      </a>
    );
  }

  return (
    <RouterLink ref={ref} to={href} {...props}>
      {children}
    </RouterLink>
  );
});

Link.displayName = 'NextLinkShim';

export default Link;
