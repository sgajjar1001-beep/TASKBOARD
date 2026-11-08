import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Safely register PWA service worker with error handling for iframe preview
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    registerSW({ immediate: true });
  }
} catch (e) {
  console.warn('Service worker registration note:', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

