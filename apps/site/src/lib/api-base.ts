// Returns the API base URL. On wyattau.com, calls are same-origin (empty string).
// On any other origin (GitHub Pages, localhost), calls go to wyattau.com.
export function apiBase(): string {
  if (typeof window !== 'undefined' && window.location.hostname === 'wyattau.com') {
    return '';
  }
  return 'https://wyattau.com';
}
