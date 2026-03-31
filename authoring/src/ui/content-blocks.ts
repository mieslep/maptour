import { marked } from 'marked';
import type { ContentBlock, GalleryImage } from '../types';

type OnChange = () => void;

/**
 * Render a content block editor for an array of content blocks.
 * Returns the container element.
 */
export function renderContentBlockEditor(
  blocks: ContentBlock[],
  onChange: OnChange,
  label: string,
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'cb-editor';

  function rebuild(): void {
    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'cb-header';
    header.innerHTML = `<span class="cb-label">${label}</span>`;
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-sm';
    addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Block';
    addBtn.onclick = () => {
      blocks.push({ type: 'text', body: '' });
      onChange();
      rebuild();
    };
    header.appendChild(addBtn);
    container.appendChild(header);

    blocks.forEach((block, idx) => {
      const blockEl = renderSingleBlock(block, idx, blocks, onChange, rebuild);
      container.appendChild(blockEl);
    });
  }

  rebuild();
  return container;
}

function renderSingleBlock(
  block: ContentBlock,
  idx: number,
  blocks: ContentBlock[],
  onChange: OnChange,
  rebuild: () => void,
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'cb-block';

  // Block header with type selector and controls
  const header = document.createElement('div');
  header.className = 'cb-block-header';

  const typeSelect = document.createElement('select');
  typeSelect.className = 'input-sm';
  for (const t of ['text', 'image', 'gallery', 'video', 'audio']) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    if (t === block.type) opt.selected = true;
    typeSelect.appendChild(opt);
  }
  typeSelect.onchange = () => {
    const newType = typeSelect.value as ContentBlock['type'];
    if (newType === block.type) return;
    // Convert block type, preserving what we can
    if (newType === 'text') blocks[idx] = { type: 'text', body: '' };
    else if (newType === 'image') blocks[idx] = { type: 'image', url: '' };
    else if (newType === 'gallery') blocks[idx] = { type: 'gallery', images: [{ url: '' }] };
    else if (newType === 'video') blocks[idx] = { type: 'video', url: '' };
    else if (newType === 'audio') blocks[idx] = { type: 'audio', url: '' };
    onChange();
    rebuild();
  };
  header.appendChild(typeSelect);

  const controls = document.createElement('span');
  controls.className = 'cb-controls';

  if (idx > 0) {
    const upBtn = document.createElement('button');
    upBtn.className = 'btn btn-icon';
    upBtn.title = 'Move up';
    upBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
    upBtn.onclick = () => { [blocks[idx - 1], blocks[idx]] = [blocks[idx], blocks[idx - 1]]; onChange(); rebuild(); };
    controls.appendChild(upBtn);
  }
  if (idx < blocks.length - 1) {
    const downBtn = document.createElement('button');
    downBtn.className = 'btn btn-icon';
    downBtn.title = 'Move down';
    downBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
    downBtn.onclick = () => { [blocks[idx], blocks[idx + 1]] = [blocks[idx + 1], blocks[idx]]; onChange(); rebuild(); };
    controls.appendChild(downBtn);
  }
  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-icon btn-danger';
  delBtn.title = 'Remove block';
  delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
  delBtn.onclick = () => { blocks.splice(idx, 1); onChange(); rebuild(); };
  controls.appendChild(delBtn);

  header.appendChild(controls);
  wrapper.appendChild(header);

  // Block body based on type
  const body = document.createElement('div');
  body.className = 'cb-block-body';

  if (block.type === 'text') {
    renderTextBlock(body, block, onChange);
  } else if (block.type === 'image') {
    renderImageBlock(body, block, onChange);
  } else if (block.type === 'gallery') {
    renderGalleryBlock(body, block, onChange, rebuild);
  } else if (block.type === 'video') {
    renderVideoBlock(body, block, onChange);
  } else if (block.type === 'audio') {
    renderAudioBlock(body, block, onChange);
  }

  wrapper.appendChild(body);
  return wrapper;
}

function renderTextBlock(container: HTMLElement, block: { type: 'text'; body: string }, onChange: OnChange): void {
  const wrap = document.createElement('div');
  wrap.className = 'text-block-wrap';

  const textarea = document.createElement('textarea');
  textarea.className = 'input cb-textarea';
  textarea.placeholder = 'Markdown content...';
  textarea.value = block.body;
  textarea.rows = 6;

  const preview = document.createElement('div');
  preview.className = 'cb-preview markdown-preview';
  preview.innerHTML = marked.parse(block.body || '') as string;

  textarea.oninput = () => {
    block.body = textarea.value;
    preview.innerHTML = marked.parse(block.body || '') as string;
    onChange();
  };

  wrap.appendChild(textarea);
  wrap.appendChild(preview);
  container.appendChild(wrap);
}

function renderImageBlock(container: HTMLElement, block: { type: 'image'; url: string; caption?: string; alt?: string }, onChange: OnChange): void {
  container.appendChild(makeInput('URL', block.url, v => { block.url = v; onChange(); }));
  container.appendChild(makeInput('Caption', block.caption ?? '', v => { block.caption = v || undefined; onChange(); }));
  container.appendChild(makeInput('Alt text', block.alt ?? '', v => { block.alt = v || undefined; onChange(); }));
}

function renderGalleryBlock(
  container: HTMLElement,
  block: { type: 'gallery'; images: GalleryImage[] },
  onChange: OnChange,
  rebuild: () => void,
): void {
  block.images.forEach((img, i) => {
    const imgDiv = document.createElement('div');
    imgDiv.className = 'gallery-image-item';
    const label = document.createElement('span');
    label.className = 'gallery-image-label';
    label.textContent = `Image ${i + 1}`;
    imgDiv.appendChild(label);
    imgDiv.appendChild(makeInput('URL', img.url, v => { img.url = v; onChange(); }));
    imgDiv.appendChild(makeInput('Caption', img.caption ?? '', v => { img.caption = v || undefined; onChange(); }));
    imgDiv.appendChild(makeInput('Alt text', img.alt ?? '', v => { img.alt = v || undefined; onChange(); }));
    if (block.images.length > 1) {
      const rmBtn = document.createElement('button');
      rmBtn.className = 'btn btn-sm btn-danger';
      rmBtn.textContent = 'Remove';
      rmBtn.onclick = () => { block.images.splice(i, 1); onChange(); rebuild(); };
      imgDiv.appendChild(rmBtn);
    }
    container.appendChild(imgDiv);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-sm';
  addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Image';
  addBtn.onclick = () => { block.images.push({ url: '' }); onChange(); rebuild(); };
  container.appendChild(addBtn);
}

function renderVideoBlock(container: HTMLElement, block: { type: 'video'; url: string; caption?: string }, onChange: OnChange): void {
  container.appendChild(makeInput('URL', block.url, v => { block.url = v; onChange(); }));
  container.appendChild(makeInput('Caption', block.caption ?? '', v => { block.caption = v || undefined; onChange(); }));
}

function renderAudioBlock(container: HTMLElement, block: { type: 'audio'; url: string; label?: string }, onChange: OnChange): void {
  container.appendChild(makeInput('URL', block.url, v => { block.url = v; onChange(); }));
  container.appendChild(makeInput('Label', block.label ?? '', v => { block.label = v || undefined; onChange(); }));
}

function makeInput(label: string, value: string, onChange: (v: string) => void): HTMLElement {
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
