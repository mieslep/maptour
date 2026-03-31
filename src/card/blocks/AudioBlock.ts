import type { AudioBlock as AudioBlockType } from '../../types';
import { t } from '../../i18n';

export function renderAudioBlock(block: AudioBlockType): HTMLElement {
  const el = document.createElement('div');
  el.className = 'maptour-block maptour-block--audio';

  if (block.label) {
    const label = document.createElement('p');
    label.className = 'maptour-audio__label';
    label.textContent = block.label;
    el.appendChild(label);
  }

  const audio = document.createElement('audio');
  audio.controls = true;
  audio.className = 'maptour-audio';
  audio.setAttribute('aria-label', block.label ?? 'Audio');

  const source = document.createElement('source');
  source.src = block.url;
  audio.appendChild(source);

  audio.onerror = () => {
    audio.style.display = 'none';
    const fallback = document.createElement('p');
    fallback.className = 'maptour-audio-error';
    fallback.textContent = t('audio_error');
    el.appendChild(fallback);
  };

  el.appendChild(audio);
  return el;
}
