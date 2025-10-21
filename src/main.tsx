import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './lib/i18n.tsx';
import { AuthProvider } from './lib/auth.tsx';
import { ToastProvider, useToast } from './components/ui/Toast';

function AppWithToast() {
  const { addToast } = useToast();

  useEffect(() => {
    const handleAddToast = (event: CustomEvent) => {
      addToast(event.detail);
    };

    window.addEventListener('add-toast' as any, handleAddToast);
    return () => window.removeEventListener('add-toast' as any, handleAddToast);
  }, [addToast]);

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <ToastProvider>
          <AppWithToast />
        </ToastProvider>
      </LanguageProvider>
    </AuthProvider>
  </StrictMode>
);
