import { createSignal } from 'solid-js';

export default function ContactForm() {
  const [name, setName] = createSignal('');
  const [email, setEmail] = createSignal('');
  const [message, setMessage] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [feedback, setFeedback] = createSignal<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  function validateEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validate(): string | null {
    if (!name().trim()) return 'Name is required.';
    if (!email().trim()) return 'Email is required.';
    if (!validateEmail(email().trim())) return 'Enter a valid email address.';
    if (!message().trim()) return 'Message is required.';
    if (message().trim().length > 2000) return 'Message must be under 2000 characters.';
    return null;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setFeedback(null);

    const error = validate();
    if (error) {
      setFeedback({ type: 'error', text: error });
      return;
    }

    setLoading(true);

    try {
      const mailtoUrl = `mailto:wyatt_au@protonmail.com?subject=Contact%20from%20${encodeURIComponent(name().trim())}&body=${encodeURIComponent(message().trim())}%0A%0A---%0AFrom: ${encodeURIComponent(name().trim())} (${encodeURIComponent(email().trim())})`;

      window.location.href = mailtoUrl;

      setFeedback({ type: 'success', text: 'Opening your email client...' });
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setFeedback({
        type: 'error',
        text: 'Could not open email client. Please copy the address manually.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <div>
        <label
          for="contact-name"
          class="block font-mono text-xs font-bold uppercase tracking-wider mb-1"
          style="color: var(--accent);"
        >
          Name
        </label>
        <input
          id="contact-name"
          type="text"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          required
          class="w-full px-4 py-3 text-sm border outline-none transition-colors"
          style="border-color: var(--border); background: var(--bg-secondary); color: var(--text-primary);"
          placeholder="Your name"
        />
      </div>

      <div>
        <label
          for="contact-email"
          class="block font-mono text-xs font-bold uppercase tracking-wider mb-1"
          style="color: var(--accent);"
        >
          Email
        </label>
        <input
          id="contact-email"
          type="email"
          value={email()}
          onInput={(e) => setEmail(e.currentTarget.value)}
          required
          class="w-full px-4 py-3 text-sm border outline-none transition-colors"
          style="border-color: var(--border); background: var(--bg-secondary); color: var(--text-primary);"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          for="contact-message"
          class="block font-mono text-xs font-bold uppercase tracking-wider mb-1"
          style="color: var(--accent);"
        >
          Message
        </label>
        <textarea
          id="contact-message"
          value={message()}
          onInput={(e) => setMessage(e.currentTarget.value)}
          maxLength={2000}
          required
          rows={5}
          class="w-full px-4 py-3 text-sm border outline-none transition-colors resize-none"
          style="border-color: var(--border); background: var(--bg-secondary); color: var(--text-primary);"
          placeholder="Your message..."
        />
        <p class="text-xs mt-1 font-mono" style="color: var(--text-secondary);">
          {message().length}/2000
        </p>
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
        {loading() ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
