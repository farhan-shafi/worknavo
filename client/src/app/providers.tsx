import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { TooltipProvider } from '../components/ui/tooltip';

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster
            closeButton
            position="top-right"
            richColors
            toastOptions={{
              className: 'font-sans',
            }}
          />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
