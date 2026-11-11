import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { App } from './App';
import { walletConfig } from './wallet';
import './styles.css';

// Activate only after the owner supplies approved favicon artwork.
if (import.meta.env.VITE_APPROVED_FAVICON_URL) {
  const icon = document.createElement('link');
  icon.rel = 'icon';
  icon.href = import.meta.env.VITE_APPROVED_FAVICON_URL;
  document.head.append(icon);
}

const client = new QueryClient();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={walletConfig}>
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
