import type { ReactNode } from 'react';
import './AuthenticatedBackground.css';
import { VideoBackground } from '@app/architecture/VideoBackground';



export function AuthenticatedBackground({ children }: { children: ReactNode }) {
  return (
    <div className="authenticated-background">
      <VideoBackground workspace />
      <div className="authenticated-background__content">{children}</div>
    </div>
  );
}

