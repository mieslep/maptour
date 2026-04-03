/**
 * Sanitise an HTML string via strict allowlist.
 *
 * Only allows: div, img, span, and text nodes.
 * Only allows attributes: src, alt, class, style on those elements.
 * Everything else is stripped.
 */

const ALLOWED_TAGS = new Set(['DIV', 'IMG', 'SPAN']);
const ALLOWED_ATTRS = new Set(['src', 'alt', 'class', 'style']);

export function sanitiseHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const clean = document.createDocumentFragment();
  sanitiseNodes(doc.body, clean);

  const wrapper = document.createElement('div');
  wrapper.appendChild(clean);
  return wrapper.innerHTML;
}

function sanitiseNodes(source: Node, target: Node): void {
  for (const child of Array.from(source.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(child.textContent ?? ''));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      if (ALLOWED_TAGS.has(el.tagName)) {
        const cleanEl = document.createElement(el.tagName.toLowerCase());
        for (const attr of Array.from(el.attributes)) {
          if (ALLOWED_ATTRS.has(attr.name)) {
            cleanEl.setAttribute(attr.name, attr.value);
          }
        }
        sanitiseNodes(el, cleanEl);
        target.appendChild(cleanEl);
      } else {
        // Skip disallowed tags but keep their text children
        sanitiseNodes(el, target);
      }
    }
  }
}
