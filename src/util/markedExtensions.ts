import { marked } from 'marked';

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
