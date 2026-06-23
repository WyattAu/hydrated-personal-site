import { cleanup, render } from '@solidjs/testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '../../components/solid/ErrorBoundary';

function ThrowComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test error');
  return <div>All good</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders children when no error', () => {
    const { getByText } = render(() => (
      <ErrorBoundary>
        <ThrowComponent shouldThrow={false} />
      </ErrorBoundary>
    ));
    expect(getByText('All good')).toBeTruthy();
  });

  it('renders fallback on error', () => {
    const { getByText } = render(() => (
      <ErrorBoundary fallbackTitle="Test Error">
        <ThrowComponent shouldThrow={true} />
      </ErrorBoundary>
    ));
    expect(getByText('Test Error')).toBeTruthy();
  });

  it('shows retry button on error', () => {
    const { getByText } = render(() => (
      <ErrorBoundary>
        <ThrowComponent shouldThrow={true} />
      </ErrorBoundary>
    ));
    expect(getByText('Retry')).toBeTruthy();
  });

  it('retry button is type=button', () => {
    const { getByRole } = render(() => (
      <ErrorBoundary>
        <ThrowComponent shouldThrow={true} />
      </ErrorBoundary>
    ));
    const btn = getByRole('button', { name: 'Retry' });
    expect(btn.getAttribute('type')).toBe('button');
  });
});
