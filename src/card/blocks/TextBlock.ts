import { marked } from 'marked';
import { registerMarkedExtensions } from '../../util/markedExtensions';
import type { TextBlock as TextBlockType } from '../../types';

registerMarkedExtensions();

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
