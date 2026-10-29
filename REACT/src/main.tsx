import { StrictMode } from 'react';
import '@fontsource-variable/geist';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { AuthProvider } from './auth/AuthContext';
import { queryClient } from './queryClient';
import './styles/design-tokens.css';
import './styles/design-system.css';
import './v0/app/globals.css';
import './architecture/architecture.css';
import './styles/enterprise-dashboard.css';
import { TooltipProvider } from './v0/components/ui/tooltip';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider><App /></TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
