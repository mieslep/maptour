/**
 * Authoring tool — content-block type picker.
 *
 * Catches the bug Phil hit on 2026-05-03: the "+ Add Block" picker was
 * appended *inside* the anchor button, which sits inside the waypoint
 * modal's `overflow-y: auto` container. The bottom two items (Audio and
 * Map) rendered correctly but were clipped out of the visible viewport,
 * making it look like only Text/Image/Gallery/Video were available.
 *
 * Note: the authoring/ directory is excluded from coverage in
 * vite.config.ts; these tests still run as part of the unit suite to
 * guard the regression class.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderContentBlockEditor } from '../../authoring/src/ui/content-blocks';
import type { ContentBlock } from '../../authoring/src/types';

beforeEach(() => {
  document.body.innerHTML = '';
});

function openPicker(): { addBtn: HTMLButtonElement; menu: HTMLElement } {
  const blocks: ContentBlock[] = [];
  const onChange = vi.fn();
  const editor = renderContentBlockEditor(blocks, onChange, '');
  document.body.appendChild(editor);
  const addBtn = editor.querySelector('.cb-add-btn') as HTMLButtonElement;
  expect(addBtn).not.toBeNull();
  addBtn.click();
  const menu = document.querySelector('.cb-menu') as HTMLElement;
  expect(menu).not.toBeNull();
  return { addBtn, menu };
}

describe('+ Add Block picker — type list', () => {
  it('offers exactly six types: text, image, gallery, video, audio, map', () => {
    const { menu } = openPicker();
    const labels = Array.from(menu.querySelectorAll('.cb-menu-item')).map((b) => b.textContent);
    expect(labels).toEqual(['Text', 'Image', 'Gallery', 'Video', 'Audio', 'Map']);
  });

  it('Audio is in the picker (regression for clipping bug)', () => {
    const { menu } = openPicker();
    const audioBtn = Array.from(menu.querySelectorAll('.cb-menu-item'))
      .find((b) => b.textContent === 'Audio');
    expect(audioBtn).toBeTruthy();
  });

  it('Map is in the picker (regression for clipping bug)', () => {
    const { menu } = openPicker();
    const mapBtn = Array.from(menu.querySelectorAll('.cb-menu-item'))
      .find((b) => b.textContent === 'Map');
    expect(mapBtn).toBeTruthy();
  });
});

describe('+ Add Block picker — placement', () => {
  it('is appended to document.body, not the anchor', () => {
    const { addBtn, menu } = openPicker();
    expect(menu.parentElement).toBe(document.body);
    // And specifically NOT inside the button (the old behaviour).
    expect(addBtn.contains(menu)).toBe(false);
  });

  it('uses position:fixed so ancestor overflow does not clip it', () => {
    const { menu } = openPicker();
    expect(menu.style.position).toBe('fixed');
  });

  it('CSS z-index for .cb-menu sits above the waypoint and edit modals', () => {
    // Catches the second regression on 2026-05-03: after moving the menu to
    // document.body, the default z-index (100) was below .waypoint-modal
    // (1100) and the picker rendered hidden beneath the modal overlay.
    // The styles.css rule MUST keep z-index above 2000 so the menu wins
    // against both .waypoint-modal and .cb-modal-overlay stacking contexts.
    const css = readFileSync(
      resolve(process.cwd(), 'authoring/src/styles.css'),
      'utf8',
    );
    const cbMenuRule = css.match(/\.cb-menu\s*\{[^}]*\}/s);
    expect(cbMenuRule).not.toBeNull();
    const zMatch = cbMenuRule![0].match(/z-index:\s*(\d+)/);
    expect(zMatch).not.toBeNull();
    expect(Number(zMatch![1])).toBeGreaterThanOrEqual(2001);
  });
});

describe('+ Add Block picker — selection', () => {
  it('clicking Audio creates an audio block and closes the picker', () => {
    const blocks: ContentBlock[] = [];
    const onChange = vi.fn();
    const editor = renderContentBlockEditor(blocks, onChange, '');
    document.body.appendChild(editor);

    (editor.querySelector('.cb-add-btn') as HTMLButtonElement).click();
    const audioBtn = Array.from(document.querySelectorAll('.cb-menu-item'))
      .find((b) => b.textContent === 'Audio') as HTMLButtonElement;
    audioBtn.click();

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('audio');
    expect(document.querySelector('.cb-menu')).toBeNull();
  });

  it('clicking Map creates a map block and closes the picker', () => {
    const blocks: ContentBlock[] = [];
    const onChange = vi.fn();
    const editor = renderContentBlockEditor(blocks, onChange, '');
    document.body.appendChild(editor);

    (editor.querySelector('.cb-add-btn') as HTMLButtonElement).click();
    const mapBtn = Array.from(document.querySelectorAll('.cb-menu-item'))
      .find((b) => b.textContent === 'Map') as HTMLButtonElement;
    mapBtn.click();

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('map');
    expect(document.querySelector('.cb-menu')).toBeNull();
  });
});
