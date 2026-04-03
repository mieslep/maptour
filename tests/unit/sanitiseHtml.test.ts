import { describe, it, expect } from 'vitest';
import { sanitiseHtml } from '../../src/util/sanitiseHtml';

describe('sanitiseHtml', () => {
  it('allows div, span, and img with safe attributes', () => {
    const input = '<div class="logo"><img src="logo.png" alt="Logo"><span>Text</span></div>';
    expect(sanitiseHtml(input)).toBe(input);
  });

  it('strips script tags', () => {
    expect(sanitiseHtml('<script>alert("xss")</script>')).toBe('');
  });

  it('strips onerror and other event attributes', () => {
    const result = sanitiseHtml('<img src="x.png" onerror="alert(1)" alt="ok">');
    expect(result).toBe('<img src="x.png" alt="ok">');
  });

  it('strips disallowed tags but keeps their text', () => {
    expect(sanitiseHtml('<b>bold</b> text')).toBe('bold text');
  });

  it('strips anchor tags but keeps text', () => {
    expect(sanitiseHtml('<a href="http://evil.com">click</a>')).toBe('click');
  });

  it('allows style attribute', () => {
    const input = '<div style="height:28px">content</div>';
    expect(sanitiseHtml(input)).toBe(input);
  });

  it('handles nested disallowed tags', () => {
    const result = sanitiseHtml('<div><p><strong>hello</strong></p></div>');
    expect(result).toBe('<div>hello</div>');
  });

  it('preserves plain text', () => {
    expect(sanitiseHtml('just text')).toBe('just text');
  });

  it('handles empty string', () => {
    expect(sanitiseHtml('')).toBe('');
  });

  it('strips iframe tags', () => {
    expect(sanitiseHtml('<iframe src="http://evil.com"></iframe>')).toBe('');
  });
});
