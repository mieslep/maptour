import { marked } from 'marked';

const DOT_SPAN = '<span class="maptour-dot" aria-label="waypoint marker"></span>';

/**
 * Replace {dot} shortcodes in a plain-text string with the dot span,
 * HTML-escaping everything else. For fields that aren't markdown but
 * still want to support the inline waypoint marker (e.g. waypoint.text
 * shown in the guidance banner). Set the result via innerHTML.
 */
export function replaceDotShortcode(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return escaped.replace(/\{dot\}/g, DOT_SPAN);
}

// Inline shortcode {dot} -> styled span matching the active waypoint marker.
// Imported by both the player (TextBlock) and the authoring tool's live preview
// so the two stay in sync. Registration is idempotent.
let registered = false;

export function registerMarkedExtensions(): void {
  if (registered) return;
  registered = true;
  marked.use({
    extensions: [
      {
        name: 'dot',
        level: 'inline',
        start(src: string) {
          const idx = src.indexOf('{dot}');
          return idx === -1 ? undefined : idx;
        },
        tokenizer(src: string) {
          const match = /^\{dot\}/.exec(src);
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
}
