export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/`/g, '&#x60;');
}

export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const match = url.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!match) return '';
  const protocol = match[1].toLowerCase();
  if (protocol === 'javascript') return '';
  if (!['http:', 'https:', 'mailto:'].includes(protocol + ':')) return '';
  return url;
}

export function trimAndClean(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
