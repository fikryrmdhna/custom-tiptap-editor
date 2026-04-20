import { Node, Mark, mergeAttributes } from '@tiptap/core';

// 1. Video Node Extension for native <video> embeds (e.g. .mp4)
export const Video = Node.create({
  name: 'video',
  group: 'block',
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      width: { default: '100%' },
      style: { default: 'max-height: 500px; display: block; margin: 1rem auto; border-radius: 8px;' }
    };
  },
  parseHTML() {
    return [{ tag: 'video[src]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes)];
  },
});

// 2. Three Black Dots
export const ThreeBlackDots = Node.create({
  name: 'threeBlackDots',
  group: 'block',
  parseHTML() {
    return [{ tag: 'div.tempo-three-dots' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 
      class: 'tempo-three-dots', 
      style: 'text-align:center; font-size: 2rem; font-weight: bold; margin: 24px 0; color: #000;' 
    }), '•••'];
  },
});

// 3. Grey Box With Red Title (Wrapper)
export const TempoGreyBox = Node.create({
  name: 'tempoGreyBox',
  group: 'block',
  content: 'block+',
  parseHTML() {
    return [{ tag: 'div.tempo-grey-box' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 
      class: 'tempo-grey-box', 
      style: 'background-color: #f3f4f6; padding: 1.25rem; border-left: 4px solid #ef4444; margin: 1.5rem 0; border-radius: 4px;' 
    }), 0];
  },
});

// 4. Drop Cap Mark (Huge first letter)
export const TempoDropCap = Mark.create({
  name: 'tempoDropCap',
  parseHTML() {
    return [{ tag: 'span.tempo-dropcap' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 
      class: 'tempo-dropcap',
      style: 'float: left; font-size: 4rem; line-height: 3.5rem; margin-right: 0.5rem; font-weight: bold; color: #000;'
    }), 0];
  },
});

// 5. Red Dot Mark (End of article)
export const TempoRedDot = Mark.create({
  name: 'tempoRedDot',
  parseHTML() {
    return [{ tag: 'span.tempo-red-dot' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 
      class: 'tempo-red-dot',
      style: 'color: #ef4444; font-weight: 900; font-size: 1.25em;'
    }), 0];
  },
});
