import { marked } from 'marked';
import type { TextBlock as TextBlockType } from '../../types';

// Inline shortcode :dot: -> styled span matching the active waypoint marker.
// Registered once at module load.
marked.use({
  extensions: [
    {
      name: 'dot',
      level: 'inline',
      start(src: string) {
        const idx = src.indexOf(':dot:');
        return idx === -1 ? undefined : idx;
      },
      tokenizer(src: string) {
        const match = /^:dot:/.exec(src);
        if (match) {
          return { type: 'dot', raw: match[0] };
        }
        return undefined;
      },
      renderer() {
        return '<span class="maptour-dot" aria-label="waypoint marker"></span>';
      },
    },
  ],
});

export function renderTextBlock(block: TextBlockType): HTMLElement {
  const el = document.createElement('div');
  el.className = 'maptour-block maptour-block--text';

  // marked.parse returns string | Promise<string> depending on version
  const result = marked.parse(block.body);
  if (typeof result === 'string') {
    el.innerHTML = result;
  } else {
    // async path - show loading then fill in
    el.innerHTML = '<p>Loading...</p>';
    result.then((html) => { el.innerHTML = html; });
  }

  return el;
}
