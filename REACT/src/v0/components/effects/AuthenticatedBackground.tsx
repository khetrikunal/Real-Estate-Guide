import type { ReactNode } from 'react';
import './AuthenticatedBackground.css';
import dashboardBg from '../../../../src/assets/realestateLogo.jpeg'



export function AuthenticatedBackground({ children }: { children: ReactNode }) {
  return (
    <div className="authenticated-background">
      <div
        className="authenticated-background__bg"
        aria-hidden="true"
        style={{ backgroundImage: `url(${dashboardBg})` }}
      />
      <div className="authenticated-background__overlay" aria-hidden="true" />
      <div className="authenticated-background__content">{children}</div>
    </div>
  );
}

