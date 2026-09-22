'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';

// 全局 fetcher
const globalFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  return res.json();
};

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SWRConfig
        value={{
          fetcher: globalFetcher,
          revalidateOnFocus: false,
          revalidateOnReconnect: false,
          dedupingInterval: 60000,
          focusThrottleInterval: 60000,
          errorRetryCount: 2,
          keepPreviousData: true,
          revalidateIfStale: false,
          provider: () => new Map(),
        }}
      >
        {children}
      </SWRConfig>
    </ThemeProvider>
  );
}
