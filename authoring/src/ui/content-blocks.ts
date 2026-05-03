import { marked } from 'marked';
import { registerMarkedExtensions } from '../../../src/util/markedExtensions';

registerMarkedExtensions();
import type { ContentBlock, GalleryImage } from '../types';
import { resolveAssetUrl } from '../store';

type OnChange = () => void;
type BeforeMutate = () => void;

// Module-level ref so all internal functions can call it without threading it everywhere
let _beforeMutate: BeforeMutate = () => {};

/**
 * Render a WYSIWYG-style content block editor with preview mode and edit-on-click.
 * Returns the container element.
 *
 * @param onBeforeMutate - called before any data mutation (undo snapshot hook)
 */
export function renderContentBlockEditor(
  blocks: ContentBlock[],
  onChange: OnChange,
  label: string,
  onBeforeMutate?: BeforeMutate,
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'cb-editor';

  function rebuild(): void {
    container.innerHTML = '';
    // Set module-level ref for this editor instance during rebuild
    _beforeMutate = onBeforeMutate || (() => {});

    if (label) {
      const headerLabel = document.createElement('div');
      headerLabel.className = 'cb-label';
      headerLabel.textContent = label;
      container.appendChild(headerLabel);
    }

    blocks.forEach((block, idx) => {
      const blockEl = renderPreviewBlock(block, idx, blocks, onChange, rebuild);
      container.appendChild(blockEl);
    });

    // Always show "+ Add Block" button
    const addBtn = document.createElement('button');
    addBtn.className = 'cb-add-btn';
    addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Block';
    addBtn.onclick = (e) => {
      e.stopPropagation();
      showTypePicker(addBtn, (type) => {
        _beforeMutate();
        const newBlock = createEmptyBlock(type);
        blocks.push(newBlock);
        onChange();
        rebuild();
        openEditModal(newBlock, blocks.length - 1, blocks, onChange, rebuild);
      });
    };
    container.appendChild(addBtn);
  }

  rebuild();
  return container;
}

/* ---------- Preview Block ---------- */

function renderPreviewBlock(
  block: ContentBlock,
  idx: number,
  blocks: ContentBlock[],
  onChange: OnChange,
  rebuild: () => void,
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'cb-preview-block';

  // Click the whole block to open edit modal
  wrapper.onclick = (e) => {
    if ((e.target as HTMLElement).closest('.cb-block-actions')) return;
    openEditModal(block, idx, blocks, onChange, rebuild);
  };

  // Inline hover actions: move up, move down, delete
  const actions = document.createElement('div');
  actions.className = 'cb-block-actions';

  if (idx > 0) {
    const upBtn = document.createElement('button');
    upBtn.className = 'cb-action-btn';
    upBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
    upBtn.title = 'Move up';
    upBtn.onclick = (e) => {
      e.stopPropagation();
      _beforeMutate();
      [blocks[idx - 1], blocks[idx]] = [blocks[idx], blocks[idx - 1]];
      onChange(); rebuild();
    };
    actions.appendChild(upBtn);
  }

  if (idx < blocks.length - 1) {
    const downBtn = document.createElement('button');
    downBtn.className = 'cb-action-btn';
    downBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
    downBtn.title = 'Move down';
    downBtn.onclick = (e) => {
      e.stopPropagation();
      _beforeMutate();
      [blocks[idx], blocks[idx + 1]] = [blocks[idx + 1], blocks[idx]];
      onChange(); rebuild();
    };
    actions.appendChild(downBtn);
  }

  const delBtn = document.createElement('button');
  delBtn.className = 'cb-action-btn cb-action-btn--danger';
  delBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
  delBtn.title = 'Delete';
  delBtn.onclick = (e) => {
    e.stopPropagation();
    _beforeMutate(); blocks.splice(idx, 1); onChange(); rebuild();
  };
  actions.appendChild(delBtn);

  wrapper.appendChild(actions);

  // Render content preview
  const content = document.createElement('div');
  content.className = 'cb-preview-content';

  if (isBlockEmpty(block)) {
    const placeholder = document.createElement('div');
    placeholder.className = 'cb-placeholder';
    placeholder.textContent = `${block.type.charAt(0).toUpperCase() + block.type.slice(1)} block \u2014 Click to edit`;
    content.appendChild(placeholder);
  } else if (block.type === 'text') {
    const html = marked.parse(block.body || '') as string;
    const preview = document.createElement('div');
    preview.className = 'markdown-preview';
    preview.innerHTML = html;
    content.appendChild(preview);
  } else if (block.type === 'image') {
    renderImagePreview(content, block);
  } else if (block.type === 'gallery') {
    renderGalleryPreview(content, block);
  } else if (block.type === 'video') {
    renderVideoPreview(content, block);
  } else if (block.type === 'audio') {
    renderAudioPreview(content, block);
  } else if (block.type === 'map') {
    const mapLabel = document.createElement('div');
    mapLabel.style.cssText = 'display:flex; align-items:center; gap:6px; color:#64748b; font-size:13px;';
    mapLabel.innerHTML = '<i class="fa-solid fa-map" aria-hidden="true"></i> Inline Map';
    content.appendChild(mapLabel);
  }

  wrapper.appendChild(content);
  return wrapper;
}

function isBlockEmpty(block: ContentBlock): boolean {
  if (block.type === 'text') return !block.body.trim();
  if (block.type === 'image') return !block.url.trim();
  if (block.type === 'gallery') return block.images.length === 0 || block.images.every(i => !i.url.trim());
  if (block.type === 'video') return !block.url.trim();
  if (block.type === 'audio') return !block.url.trim();
  if (block.type === 'map') return false;
  return true;
}

function renderImagePreview(container: HTMLElement, block: { type: 'image'; url: string; caption?: string; caption_position?: 'above' | 'below'; alt?: string; padding_x?: number; padding_y?: number }): void {
  if (block.url) {
    const py = block.padding_y ?? 5;
    const px = block.padding_x ?? 5;
    container.style.padding = `${py}% ${px}%`;

    const makeCap = (): HTMLElement | null => {
      if (!block.caption) return null;
      const cap = document.createElement('div');
      cap.className = 'cb-preview-caption';
      cap.style.textAlign = 'center';
      cap.textContent = block.caption;
      return cap;
    };

    if (block.caption_position === 'above') {
      const cap = makeCap();
      if (cap) container.appendChild(cap);
    }

    const img = document.createElement('img');
    img.src = resolveAssetUrl(block.url);
    img.alt = block.alt || '';
    img.style.maxWidth = '100%';
    img.style.borderRadius = '4px';
    img.onerror = () => { img.replaceWith(makePlaceholderImg(`\ud83d\udcf7 ${block.url}`)); };
    container.appendChild(img);

    if (block.caption_position !== 'above') {
      const cap = makeCap();
      if (cap) container.appendChild(cap);
    }
  } else {
    container.appendChild(makePlaceholderImg('No image URL'));
  }
}

function renderGalleryPreview(container: HTMLElement, block: { type: 'gallery'; images: GalleryImage[] }): void {
  const row = document.createElement('div');
  row.className = 'cb-gallery-row';
  for (const img of block.images) {
    if (!img.url) continue;
    const thumb = document.createElement('img');
    thumb.src = resolveAssetUrl(img.url);
    thumb.alt = img.alt || '';
    thumb.className = 'cb-gallery-thumb';
    thumb.onerror = () => { thumb.replaceWith(makePlaceholderImg('?')); };
    row.appendChild(thumb);
  }
  if (row.children.length === 0) {
    container.appendChild(makePlaceholderImg('No gallery images'));
  } else {
    container.appendChild(row);
  }
}

function renderVideoPreview(container: HTMLElement, block: { type: 'video'; url: string; caption?: string }): void {
  const videoId = extractYouTubeId(block.url);
  if (videoId) {
    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'cb-video-thumb-wrap';
    const thumb = document.createElement('img');
    thumb.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    thumb.alt = 'Video thumbnail';
    thumb.className = 'cb-video-thumb';
    const playIcon = document.createElement('div');
    playIcon.className = 'cb-video-play';
    playIcon.innerHTML = '<i class="fa-solid fa-play"></i>';
    thumbWrap.appendChild(thumb);
    thumbWrap.appendChild(playIcon);
    container.appendChild(thumbWrap);
    if (block.caption) {
      const cap = document.createElement('div');
      cap.className = 'cb-preview-caption';
      cap.textContent = block.caption;
      container.appendChild(cap);
    }
  } else if (block.url) {
    const link = document.createElement('div');
    link.className = 'cb-preview-caption';
    link.textContent = `Video: ${block.url}`;
    container.appendChild(link);
  } else {
    container.appendChild(makePlaceholderImg('No video URL'));
  }
}

function renderAudioPreview(container: HTMLElement, block: { type: 'audio'; url: string; label?: string }): void {
  if (block.url) {
    if (block.label) {
      const lbl = document.createElement('div');
      lbl.className = 'cb-preview-caption';
      lbl.style.marginBottom = '4px';
      lbl.textContent = block.label;
      container.appendChild(lbl);
    }
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = resolveAssetUrl(block.url);
    audio.style.width = '100%';
    container.appendChild(audio);
  } else {
    container.appendChild(makePlaceholderImg('No audio URL'));
  }
}

function makePlaceholderImg(text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'cb-placeholder';
  el.textContent = text;
  return el;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

/* ---------- Kebab Menu ---------- */

function showKebabMenu(
  anchor: HTMLElement,
  idx: number,
  blocks: ContentBlock[],
  onChange: OnChange,
  rebuild: () => void,
): void {
  // Remove any existing menu
  closeAllMenus();

  const menu = document.createElement('div');
  menu.className = 'cb-menu';

  const items: { label: string; icon: string; cls?: string; disabled?: boolean; action: () => void }[] = [
    {
      label: 'Insert Above', icon: 'fa-circle-plus', action: () => {
        showTypePicker(anchor, (type) => {
          const newBlock = createEmptyBlock(type);
          blocks.splice(idx, 0, newBlock);
          onChange();
          rebuild();
          openEditModal(newBlock, idx, blocks, onChange, rebuild);
        });
      },
    },
    {
      label: 'Insert Below', icon: 'fa-circle-plus', action: () => {
        showTypePicker(anchor, (type) => {
          const newBlock = createEmptyBlock(type);
          blocks.splice(idx + 1, 0, newBlock);
          onChange();
          rebuild();
          openEditModal(newBlock, idx + 1, blocks, onChange, rebuild);
        });
      },
    },
    {
      label: 'Move Up', icon: 'fa-arrow-up', disabled: idx === 0, action: () => {
        [blocks[idx - 1], blocks[idx]] = [blocks[idx], blocks[idx - 1]];
        onChange(); rebuild();
      },
    },
    {
      label: 'Move Down', icon: 'fa-arrow-down', disabled: idx === blocks.length - 1, action: () => {
        [blocks[idx], blocks[idx + 1]] = [blocks[idx + 1], blocks[idx]];
        onChange(); rebuild();
      },
    },
    {
      label: 'Delete', icon: 'fa-trash', cls: 'cb-menu-item--danger', action: () => {
        blocks.splice(idx, 1); onChange(); rebuild();
      },
    },
  ];

  for (const item of items) {
    const btn = document.createElement('button');
    btn.className = 'cb-menu-item' + (item.cls ? ` ${item.cls}` : '');
    btn.disabled = !!item.disabled;
    btn.innerHTML = `<i class="fa-solid ${item.icon}"></i> ${item.label}`;
    btn.onclick = (e) => {
      e.stopPropagation();
      closeAllMenus();
      item.action();
    };
    menu.appendChild(btn);
  }

  // Position below the kebab button
  anchor.style.position = 'relative';
  menu.style.top = '100%';
  menu.style.right = '0';
  anchor.appendChild(menu);

  // Close on click outside
  const closeHandler = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) {
      menu.remove();
      document.removeEventListener('click', closeHandler, true);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler, true), 0);
}

function closeAllMenus(): void {
  document.querySelectorAll('.cb-menu').forEach(m => m.remove());
}

/* ---------- Type Picker ---------- */

function showTypePicker(anchor: HTMLElement, onPick: (type: ContentBlock['type']) => void): void {
  closeAllMenus();
  const menu = document.createElement('div');
  menu.className = 'cb-menu';
  const types: ContentBlock['type'][] = ['text', 'image', 'gallery', 'video', 'audio', 'map'];
  for (const t of types) {
    const btn = document.createElement('button');
    btn.className = 'cb-menu-item';
    btn.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    btn.onclick = (e) => {
      e.stopPropagation();
      menu.remove();
      onPick(t);
    };
    menu.appendChild(btn);
  }

  // Append to document.body and position via fixed coordinates so the menu
  // is NOT clipped by an ancestor's overflow:auto / overflow:hidden (e.g.
  // the waypoint modal's scroll container, which used to clip the bottom
  // two items — Audio and Map — out of view).
  const rect = anchor.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.left = `${rect.left + rect.width / 2}px`;
  menu.style.transform = 'translateX(-50%)';
  document.body.appendChild(menu);

  // Re-clamp inside the viewport if the picker would overflow the bottom.
  const menuRect = menu.getBoundingClientRect();
  if (menuRect.bottom > window.innerHeight - 8) {
    // Flip above the anchor instead.
    menu.style.top = `${rect.top - menuRect.height - 4}px`;
  }

  const closeHandler = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) {
      menu.remove();
      document.removeEventListener('click', closeHandler, true);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler, true), 0);
}

/* ---------- Create Empty Block ---------- */

function createEmptyBlock(type: ContentBlock['type']): ContentBlock {
  if (type === 'text') return { type: 'text', body: '' };
  if (type === 'image') return { type: 'image', url: '' };
  if (type === 'gallery') return { type: 'gallery', images: [{ url: '' }] };
  if (type === 'video') return { type: 'video', url: '' };
  if (type === 'map') return { type: 'map' };
  return { type: 'audio', url: '' };
}

/* ---------- Edit Modal ---------- */

function openEditModal(
  block: ContentBlock,
  idx: number,
  blocks: ContentBlock[],
  onChange: OnChange,
  rebuild: () => void,
): void {
  // Snapshot for undo before any edits in this modal
  _beforeMutate();

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'cb-modal-overlay';

  // Modal card
  const modal = document.createElement('div');
  modal.className = 'cb-modal';

  // Header
  const header = document.createElement('div');
  header.className = 'cb-modal-header';
  const title = document.createElement('span');
  title.textContent = `Edit ${block.type.charAt(0).toUpperCase() + block.type.slice(1)} Block`;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn-icon';
  closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
  closeBtn.onclick = () => closeModal();
  header.appendChild(title);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'cb-modal-body';

  // Type selector
  const typeRow = document.createElement('div');
  typeRow.className = 'input-row';
  const typeLbl = document.createElement('label');
  typeLbl.className = 'input-label';
  typeLbl.textContent = 'Type';
  const typeSelect = document.createElement('select');
  typeSelect.className = 'input';
  for (const t of ['text', 'image', 'gallery', 'video', 'audio', 'map']) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    if (t === block.type) opt.selected = true;
    typeSelect.appendChild(opt);
  }
  typeSelect.onchange = () => {
    const newType = typeSelect.value as ContentBlock['type'];
    if (newType === block.type) return;
    _beforeMutate();
    const newBlock = createEmptyBlock(newType);
    blocks[idx] = newBlock;
    onChange();
    overlay.remove();
    openEditModal(newBlock, idx, blocks, onChange, rebuild);
  };
  typeRow.appendChild(typeLbl);
  typeRow.appendChild(typeSelect);
  body.appendChild(typeRow);

  // Fields per type
  if (block.type === 'text') {
    renderTextModalFields(body, block, onChange);
  } else if (block.type === 'image') {
    renderImageModalFields(body, block, onChange);
  } else if (block.type === 'gallery') {
    renderGalleryModalFields(body, block, onChange);
  } else if (block.type === 'video') {
    renderVideoModalFields(body, block, onChange);
  } else if (block.type === 'audio') {
    renderAudioModalFields(body, block, onChange);
  } else if (block.type === 'map') {
    const info = document.createElement('div');
    info.style.cssText = 'color:#64748b; font-size:13px; padding:8px 0;';
    info.textContent = 'Shows an inline map centred on the current waypoint segment.';
    body.appendChild(info);

    const heightInput = makeModalInput('Height', String(block.height ?? '200'), v => {
      block.height = v ? Number(v) : undefined;
      onChange();
    });
    (heightInput.querySelector('input') as HTMLInputElement).placeholder = '200 (pixels)';
    body.appendChild(heightInput);

    const zoomInput = makeModalInput('Zoom', String(block.zoom ?? ''), v => {
      block.zoom = v ? Number(v) : undefined;
      onChange();
    });
    (zoomInput.querySelector('input') as HTMLInputElement).placeholder = '0 (relative: +1 closer, −1 further)';
    body.appendChild(zoomInput);

    const oxInput = makeModalInput('Nudge east/west', String(block.offset_x ?? ''), v => {
      block.offset_x = v ? Number(v) : undefined;
      onChange();
    });
    (oxInput.querySelector('input') as HTMLInputElement).placeholder = '0 (metres, +east −west)';
    body.appendChild(oxInput);

    const oyInput = makeModalInput('Nudge north/south', String(block.offset_y ?? ''), v => {
      block.offset_y = v ? Number(v) : undefined;
      onChange();
    });
    (oyInput.querySelector('input') as HTMLInputElement).placeholder = '0 (metres, +north −south)';
    body.appendChild(oyInput);
  }

  modal.appendChild(body);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'cb-modal-footer';
  const doneBtn = document.createElement('button');
  doneBtn.className = 'btn btn-primary';
  doneBtn.textContent = 'Done';
  doneBtn.onclick = () => closeModal();
  footer.appendChild(doneBtn);
  modal.appendChild(footer);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Close on backdrop click
  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };

  // Close on Escape
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', escHandler);

  function closeModal(): void {
    document.removeEventListener('keydown', escHandler);
    overlay.remove();
    rebuild();
  }
}

/* ---------- Modal Field Renderers ---------- */

function renderTextModalFields(container: HTMLElement, block: { type: 'text'; body: string }, onChange: OnChange): void {
  const textarea = document.createElement('textarea');
  textarea.className = 'input cb-textarea';
  textarea.placeholder = 'Markdown content...';
  textarea.value = block.body;
  textarea.rows = 6;

  const hint = document.createElement('div');
  hint.style.cssText = 'color:#64748b; font-size:12px; padding:4px 0;';
  hint.innerHTML = 'Markdown supported. Use <code>{dot}</code> for an inline waypoint marker.';

  const preview = document.createElement('div');
  preview.className = 'cb-modal-md-preview markdown-preview';
  preview.innerHTML = marked.parse(block.body || '') as string;

  textarea.oninput = () => {
    block.body = textarea.value;
    preview.innerHTML = marked.parse(block.body || '') as string;
    onChange();
  };

  container.appendChild(textarea);
  container.appendChild(hint);
  container.appendChild(preview);
}

function renderImageModalFields(container: HTMLElement, block: { type: 'image'; url: string; caption?: string; caption_position?: 'above' | 'below'; alt?: string; padding_x?: number; padding_y?: number }, onChange: OnChange): void {
  const imgPreview = document.createElement('div');
  imgPreview.className = 'cb-modal-img-preview';

  let previewTimer: ReturnType<typeof setTimeout> | null = null;
  const updatePreview = () => {
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      imgPreview.innerHTML = '';
      if (block.url) {
        const img = document.createElement('img');
        img.src = resolveAssetUrl(block.url);
        img.style.maxWidth = '100%';
        img.style.maxHeight = '200px';
        img.style.borderRadius = '4px';
        img.onerror = () => { imgPreview.textContent = 'Image not found'; };
        imgPreview.appendChild(img);
      }
    }, 400);
  };

  container.appendChild(makeModalInput('URL', block.url, v => { block.url = v; onChange(); updatePreview(); }));
  container.appendChild(makeModalInput('Caption', block.caption ?? '', v => { block.caption = v || undefined; onChange(); }));
  container.appendChild(makeModalInput('Alt text', block.alt ?? '', v => { block.alt = v || undefined; onChange(); }));

  // Caption position
  const capPosRow = document.createElement('div');
  capPosRow.className = 'input-row';
  const capPosLabel = document.createElement('label');
  capPosLabel.className = 'input-label';
  capPosLabel.textContent = 'Caption Position';
  const capPosSelect = document.createElement('select');
  capPosSelect.className = 'input';
  for (const pos of [{ value: 'below', label: 'Below image' }, { value: 'above', label: 'Above image' }]) {
    const opt = document.createElement('option');
    opt.value = pos.value;
    opt.textContent = pos.label;
    if ((block.caption_position ?? 'below') === pos.value) opt.selected = true;
    capPosSelect.appendChild(opt);
  }
  capPosSelect.onchange = () => {
    block.caption_position = capPosSelect.value === 'above' ? 'above' : undefined;
    onChange();
  };
  capPosRow.appendChild(capPosLabel);
  capPosRow.appendChild(capPosSelect);
  container.appendChild(capPosRow);

  // Padding (horizontal / vertical, in %)
  const padRow = document.createElement('div');
  padRow.className = 'input-row';
  const padLabel = document.createElement('label');
  padLabel.className = 'input-label';
  padLabel.textContent = 'Padding (%)';

  const padGroup = document.createElement('div');
  padGroup.style.cssText = 'display:flex; gap:8px; flex:1;';

  const makePadInput = (label: string, value: number | undefined, onSet: (v: number | undefined) => void): HTMLElement => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'flex:1; display:flex; flex-direction:column; gap:2px;';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:10px; color:#94a3b8;';
    lbl.textContent = label;
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'input';
    input.min = '0';
    input.max = '50';
    input.step = '1';
    input.value = value?.toString() ?? '';
    input.placeholder = '5';
    input.oninput = () => {
      const v = input.value ? Number(input.value) : undefined;
      onSet(v != null && v >= 0 ? v : undefined);
      onChange();
    };
    wrap.appendChild(lbl);
    wrap.appendChild(input);
    return wrap;
  };

  padGroup.appendChild(makePadInput('Left / Right', block.padding_x, v => { block.padding_x = v; }));
  padGroup.appendChild(makePadInput('Top / Bottom', block.padding_y, v => { block.padding_y = v; }));

  padRow.appendChild(padLabel);
  padRow.appendChild(padGroup);
  container.appendChild(padRow);

  updatePreview();
  container.appendChild(imgPreview);
}

function renderGalleryModalFields(container: HTMLElement, block: { type: 'gallery'; images: GalleryImage[] }, onChange: OnChange): void {
  const listEl = document.createElement('div');

  function rebuildList(): void {
    listEl.innerHTML = '';
    block.images.forEach((img, i) => {
      const imgDiv = document.createElement('div');
      imgDiv.className = 'gallery-image-item';
      const label = document.createElement('span');
      label.className = 'gallery-image-label';
      label.textContent = `Image ${i + 1}`;
      imgDiv.appendChild(label);
      imgDiv.appendChild(makeModalInput('URL', img.url, v => { img.url = v; onChange(); }));
      imgDiv.appendChild(makeModalInput('Caption', img.caption ?? '', v => { img.caption = v || undefined; onChange(); }));
      imgDiv.appendChild(makeModalInput('Alt text', img.alt ?? '', v => { img.alt = v || undefined; onChange(); }));
      if (block.images.length > 1) {
        const rmBtn = document.createElement('button');
        rmBtn.className = 'btn btn-sm btn-danger';
        rmBtn.textContent = 'Remove';
        rmBtn.onclick = () => { block.images.splice(i, 1); onChange(); rebuildList(); };
        imgDiv.appendChild(rmBtn);
      }
      listEl.appendChild(imgDiv);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-sm';
    addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Image';
    addBtn.onclick = () => { block.images.push({ url: '' }); onChange(); rebuildList(); };
    listEl.appendChild(addBtn);
  }

  rebuildList();
  container.appendChild(listEl);
}

function renderVideoModalFields(container: HTMLElement, block: { type: 'video'; url: string; caption?: string }, onChange: OnChange): void {
  container.appendChild(makeModalInput('URL', block.url, v => { block.url = v; onChange(); }));
  container.appendChild(makeModalInput('Caption', block.caption ?? '', v => { block.caption = v || undefined; onChange(); }));
}

function renderAudioModalFields(container: HTMLElement, block: { type: 'audio'; url: string; label?: string }, onChange: OnChange): void {
  container.appendChild(makeModalInput('URL', block.url, v => { block.url = v; onChange(); }));
  container.appendChild(makeModalInput('Label', block.label ?? '', v => { block.label = v || undefined; onChange(); }));
}

function makeModalInput(label: string, value: string, onChange: (v: string) => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'input-row';
  const lbl = document.createElement('label');
  lbl.className = 'input-label';
  lbl.textContent = label;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input';
  input.value = value;
  input.placeholder = label;
  input.oninput = () => onChange(input.value);
  wrap.appendChild(lbl);
  wrap.appendChild(input);
  return wrap;
}
