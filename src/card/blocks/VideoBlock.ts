import type { VideoBlock as VideoBlockType } from '../../types';

function extractYouTubeId(url: string): string | null {
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function renderVideoBlock(block: VideoBlockType, active = false): HTMLElement {
  const el = document.createElement('div');
  el.className = 'maptour-block maptour-block--video';

  const youtubeId = extractYouTubeId(block.url);

  if (youtubeId) {
    if (active) {
      const wrapper = document.createElement('div');
      wrapper.className = 'maptour-video-wrapper';

      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${youtubeId}?rel=0`;
      iframe.width = '560';
      iframe.height = '315';
      iframe.title = block.caption ?? 'YouTube video';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.setAttribute('loading', 'lazy');

      wrapper.appendChild(iframe);
      el.appendChild(wrapper);
    } else {
      // Lazy placeholder — only embed when active
      const placeholder = document.createElement('div');
      placeholder.className = 'maptour-video-placeholder';
      placeholder.dataset.youtubeId = youtubeId;
      placeholder.dataset.caption = block.caption ?? '';

      const thumb = document.createElement('img');
      thumb.src = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
      thumb.alt = block.caption ?? 'YouTube video thumbnail';
      thumb.className = 'maptour-video-placeholder__thumb';
      thumb.loading = 'lazy';

      const playBtn = document.createElement('button');
      playBtn.className = 'maptour-video-placeholder__play';
      playBtn.setAttribute('aria-label', 'Play video');
      playBtn.innerHTML = '&#9654;';

      playBtn.addEventListener('click', () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'maptour-video-wrapper';

        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${youtubeId}?rel=0&autoplay=1`;
        iframe.width = '560';
        iframe.height = '315';
        iframe.title = block.caption ?? 'YouTube video';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;

        wrapper.appendChild(iframe);
        placeholder.replaceWith(wrapper);
      });

      placeholder.appendChild(thumb);
      placeholder.appendChild(playBtn);
      el.appendChild(placeholder);
    }
  } else {
    // Non-YouTube video link
    const link = document.createElement('a');
    link.href = block.url;
    link.textContent = block.caption ?? 'Watch video';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'maptour-video-link';
    el.appendChild(link);
  }

  if (block.caption && youtubeId) {
    const caption = document.createElement('p');
    caption.className = 'maptour-video__caption';
    caption.textContent = block.caption;
    el.appendChild(caption);
  }

  return el;
}
