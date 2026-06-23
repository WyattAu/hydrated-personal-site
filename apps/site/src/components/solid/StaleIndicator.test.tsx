import { cleanup, render } from '@solidjs/testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StaleIndicator from '../../components/solid/StaleIndicator';

describe('StaleIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders nothing when no fetch timestamp', () => {
    const { container } = render(() => <StaleIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('renders stale indicator after staleness threshold', async () => {
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));

    // record a fetch 5 minutes ago (exceeds default 2-minute threshold)
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    localStorage.setItem('fetch:test', String(fiveMinAgo));

    const { container } = render(() => <StaleIndicator />);

    // The component should show the stale warning after a tick.
    await vi.advanceTimersByTimeAsync(1000);
    expect(container.textContent).toBeTruthy();

    localStorage.removeItem('fetch:test');
  });
});
