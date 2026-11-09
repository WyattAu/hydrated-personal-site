import LogoLoop from './LogoLoop';

/**
 * TechLoop — "built with" marquee for the landing retention band.
 * Wraps solid-fx LogoLoop with text node items (Astro templates cannot
 * pass JSX props to framework components, so the items live here).
 */
const TECH = [
  'RUST',
  'WEBASSEMBLY',
  'ASTRO 5',
  'SOLIDJS 1.9',
  'TAILWIND 4',
  'PLYCHART',
  'CLOUDFLARE',
] as const;

export default function TechLoop() {
  return (
    <LogoLoop
      logos={TECH.map((t) => ({
        node: (
          <span class="font-mono text-sm tracking-widest" style={{ color: 'var(--text-primary)' }}>
            {t}
          </span>
        ),
      }))}
      logoHeight={24}
      gap={56}
      speed={60}
      pauseOnHover
      fadeOut
      fadeOutColor="var(--bg-primary)"
      ariaLabel="Technologies powering this site"
    />
  );
}
