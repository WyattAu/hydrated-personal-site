import { ErrorBoundary, createSignal, type JSX } from 'solid-js';

interface Props {
  children: JSX.Element;
  fallbackTitle?: string;
}

export default function AppErrorBoundary(props: Props) {
  const [retryKey, setRetryKey] = createSignal(0);

  return (
    <ErrorBoundary
      fallback={(err, reset) => {
        if (import.meta.env.DEV) {
          console.error('[ErrorBoundary]', err);
        }
        return (
          <div
            class="p-6 border text-center"
            style="border-color: var(--border); background: var(--bg-card);"
          >
            <p class="font-mono text-sm font-bold mb-2" style="color: var(--accent);">
              {props.fallbackTitle || 'Something went wrong'}
            </p>
            <p class="text-xs mb-4" style="color: var(--text-secondary);">
              {err?.message || 'An unexpected error occurred.'}
            </p>
            <button
              class="px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider border"
              style="border-color: var(--border); color: var(--text-secondary);"
              onClick={() => {
                reset();
                setRetryKey((k) => k + 1);
              }}
            >
              Retry
            </button>
          </div>
        );
      }}
    >
      {props.children}
    </ErrorBoundary>
  );
}
