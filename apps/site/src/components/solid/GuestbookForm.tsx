import { createSignal } from 'solid-js';

export default function GuestbookForm() {
  const [name, setName] = createSignal('');
  const [message, setMessage] = createSignal('');
  const [website, setWebsite] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [feedback, setFeedback] = createSignal<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const maxLength = 500;

  function validate(): string | null {
    if (!name().trim()) return 'Name is required.';
    if (name().trim().length > 100) return 'Name must be under 100 characters.';
    if (!message().trim()) return 'Message is required.';
    if (message().trim().length > maxLength)
      return `Message must be under ${maxLength} characters.`;
    return null;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setFeedback(null);

    if (website().trim()) return;

    const error = validate();
    if (error) {
      setFeedback({ type: 'error', text: error });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name().trim(),
          message: message().trim(),
        }),
      });

      if (res.ok) {
        setFeedback({ type: 'success', text: 'Entry submitted!' });
        setName('');
        setMessage('');
      } else if (res.status === 429) {
        setFeedback({ type: 'error', text: 'Slow down — rate limited. Try again shortly.' });
      } else {
        const data = await res.json().catch(() => null);
        setFeedback({ type: 'error', text: data?.error || 'Something went wrong.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <div>
        <label
          for="gb-name"
          class="block font-mono text-xs font-bold uppercase tracking-wider mb-1"
          style="color: var(--accent);"
        >
          Name
        </label>
        <input
          id="gb-name"
          type="text"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          maxLength={100}
          required
          class="w-full px-4 py-3 text-sm border outline-none transition-colors"
          style="border-color: var(--border); background: var(--bg-secondary); color: var(--text-primary);"
          placeholder="Your name"
        />
      </div>

      <div>
        <label
          for="gb-message"
          class="block font-mono text-xs font-bold uppercase tracking-wider mb-1"
          style="color: var(--accent);"
        >
          Message
        </label>
        <textarea
          id="gb-message"
          value={message()}
          onInput={(e) => setMessage(e.currentTarget.value)}
          maxLength={maxLength}
          required
          rows={4}
          class="w-full px-4 py-3 text-sm border outline-none transition-colors resize-none"
          style="border-color: var(--border); background: var(--bg-secondary); color: var(--text-primary);"
          placeholder="Leave a message..."
        />
        <p class="text-xs mt-1 font-mono" style="color: var(--text-secondary);">
          {message().length}/{maxLength}
        </p>
      </div>

      {/* Honeypot — hidden from humans */}
      <div style="position: absolute; left: -9999px; opacity: 0; height: 0; width: 0; overflow: hidden;">
        <label for="gb-website">Website</label>
        <input
          id="gb-website"
          type="text"
          value={website()}
          onInput={(e) => setWebsite(e.currentTarget.value)}
          tabindex={-1}
          autocomplete="off"
        />
      </div>

      {feedback() && (
        <p
          class="font-mono text-xs font-bold"
          style={feedback()?.type === 'success' ? 'color: #69f0ae;' : 'color: var(--accent-warm);'}
        >
          {feedback()?.text}
        </p>
      )}

      <button
        type="submit"
        disabled={loading()}
        class="amoeba-hover px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider transition-opacity disabled:opacity-50"
        style="background: var(--accent); color: var(--bg-primary);"
      >
        {loading() ? 'Submitting...' : 'Sign'}
      </button>
    </form>
  );
}
