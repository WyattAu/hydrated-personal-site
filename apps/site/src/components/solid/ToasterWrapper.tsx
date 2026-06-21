import { Toaster } from 'solid-sonner';

export default function ToasterWrapper() {
  return (
    <Toaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          'font-family': '"JetBrains Mono", monospace',
          'font-size': '12px',
        },
      }}
    />
  );
}
