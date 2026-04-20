import { Editor, Element as SlateElement, Transforms, Node } from 'slate';
import type { Descendant } from 'slate';
import type { CustomElement, MediaType } from './types';

// ─── BLOCK / MARK HELPERS ─────────────────────────────────────────────────────
export const LIST_TYPES = ['numbered-list', 'bulleted-list'];

export const isBlockActive = (editor: Editor, format: string) => {
  const { selection } = editor;
  if (!selection) return false;
  const [match] = Array.from(Editor.nodes(editor, {
    at: Editor.unhangRange(editor, selection),
    match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === format,
  }));
  return !!match;
};

export const isMarkActive = (editor: Editor, format: string) => {
  const marks = Editor.marks(editor);
  return marks ? (marks as any)[format] === true : false;
};

export const getCurrentBlockType = (editor: Editor) => {
  const { selection } = editor;
  if (!selection) return 'paragraph';
  const excludedTypes = [...LIST_TYPES, 'list-item', 'table', 'table-row', 'table-cell', 'grey-box'];
  const [match] = Array.from(Editor.nodes(editor, {
    at: Editor.unhangRange(editor, selection),
    match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && !excludedTypes.includes((n as any).type),
  }));
  return match ? (match[0] as any).type : 'paragraph';
};

export const toggleBlock = (editor: Editor, format: string) => {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);

  if (format === 'grey-box') {
    if (isActive) {
      Transforms.unwrapNodes(editor, {
        match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === 'grey-box',
        split: true,
      });
    } else {
      Transforms.wrapNodes(editor, { type: 'grey-box', children: [] } as any);
    }
    return;
  }

  Transforms.unwrapNodes(editor, {
    match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && LIST_TYPES.includes((n as any).type),
    split: true,
  });
  const newType = isActive ? 'paragraph' : isList ? 'list-item' : format;
  Transforms.setNodes<CustomElement>(editor, { type: newType });
  if (!isActive && isList) {
    Transforms.wrapNodes(editor, { type: format, children: [] } as any);
  }
};

export const toggleMark = (editor: Editor, format: string) => {
  if (isMarkActive(editor, format)) Editor.removeMark(editor, format);
  else Editor.addMark(editor, format, true);
};

export const insertTable = (editor: Editor) => {
  const table: any = {
    type: 'table',
    children: Array.from({ length: 3 }, () => ({
      type: 'table-row',
      children: Array.from({ length: 3 }, () => ({
        type: 'table-cell',
        children: [{ type: 'paragraph', children: [{ text: '' }] }],
      })),
    })),
  };
  Transforms.insertNodes(editor, table);
  Transforms.insertNodes(editor, { type: 'paragraph', children: [{ text: '' }] } as any);
};

// ─── MEDIA HELPERS ────────────────────────────────────────────────────────────
export const detectMediaType = (url: string): MediaType => {
  const lower = url.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/.test(lower)) return 'image';
  if (/\.(mp4|webm|ogg)(\?.*)?$/.test(lower)) return 'video';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('vimeo.com')) return 'vimeo';
  return 'image';
};

export const buildEmbedUrl = (url: string, mediaType: MediaType) => {
  if (mediaType === 'youtube') {
    const isShorts = url.includes('/shorts/');
    let id = '';
    const w = url.match(/[?&]v=([^&]+)/); if (w) id = w[1];
    const s = url.match(/youtu\.be\/([^?&]+)/); if (s) id = s[1];
    const sh = url.match(/\/shorts\/([^?&]+)/); if (sh) id = sh[1];
    return { embedUrl: `https://www.youtube.com/embed/${id}`, isShorts };
  }
  if (mediaType === 'vimeo') {
    const m = url.match(/vimeo\.com\/(\d+)/);
    return { embedUrl: m ? `https://player.vimeo.com/video/${m[1]}` : url, isShorts: false };
  }
  return { embedUrl: url, isShorts: false };
};

// ─── COUNT HELPERS ────────────────────────────────────────────────────────────
export const getPlainText = (nodes: Descendant[]) => nodes.map(n => Node.string(n)).join('\n');
export const countWords = (text: string) => text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
