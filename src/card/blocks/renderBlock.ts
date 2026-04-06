import type { ContentBlock } from '../../types';
import { renderTextBlock } from './TextBlock';
import { renderImageBlock } from './ImageBlock';
import { renderGalleryBlock } from './GalleryBlock';
import { renderVideoBlock } from './VideoBlock';
import { renderAudioBlock } from './AudioBlock';
import { renderMapBlock } from './MapBlock';

export function renderBlock(block: ContentBlock, active: boolean): HTMLElement {
  switch (block.type) {
    case 'text':
      return renderTextBlock(block);
    case 'image':
      return renderImageBlock(block);
    case 'gallery':
      return renderGalleryBlock(block);
    case 'video':
      return renderVideoBlock(block, active);
    case 'audio':
      return renderAudioBlock(block);
    case 'map':
      return renderMapBlock(block);
  }
}
