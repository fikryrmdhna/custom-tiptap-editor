import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { createEditor, Editor, Element as SlateElement, Transforms, Node, Text, Range, Point } from 'slate';
import type { Descendant } from 'slate';
import { Slate, Editable, withReact, ReactEditor, useSelected, useFocused } from 'slate-react';
import { withHistory } from 'slate-history';
import isHotkey from 'is-hotkey';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
  List, ListOrdered, Quote, LayoutTemplate,
  Type, Circle, MoreHorizontal, X, Link, ExternalLink, Table, FolderOpen, Film, Image
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────
export type MediaType = 'image' | 'video' | 'youtube' | 'vimeo';

export type CustomElement = {
  type: string;
  url?: string;
  mediaType?: MediaType;
  isShorts?: boolean;
  children: (CustomText | CustomElement)[];
};

export type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  'tempo-dropcap'?: boolean;
  'tempo-red-dot'?: boolean;
};

declare module 'slate' {
  interface CustomTypes {
    Editor: Editor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

// ─── HTML TAGS MAPS ────────────────────────────────────────────────────────────
const ELEMENT_TAGS: Record<string, (el: HTMLElement) => any> = {
  P: () => ({ type: 'paragraph' }),
  H1: () => ({ type: 'heading-one' }),
  H2: () => ({ type: 'heading-two' }),
  H3: () => ({ type: 'heading-three' }),
  H4: () => ({ type: 'heading-four' }),
  H5: () => ({ type: 'heading-five' }),
  BLOCKQUOTE: () => ({ type: 'block-quote' }),
  UL: () => ({ type: 'bulleted-list' }),
  OL: () => ({ type: 'numbered-list' }),
  LI: () => ({ type: 'list-item' }),
  TABLE: () => ({ type: 'table' }),
  TR: () => ({ type: 'table-row' }),
  TD: () => ({ type: 'table-cell' }),
  TH: () => ({ type: 'table-cell' }),
  IMG: (el) => ({ type: 'media', mediaType: 'image', url: el.getAttribute('src') }),
  VIDEO: (el) => ({ type: 'media', mediaType: 'video', url: el.getAttribute('src') }),
  IFRAME: (el) => {
    const src = el.getAttribute('src') || '';
    const isShorts = el.getAttribute('data-shorts') === 'true';
    const mediaType: MediaType = src.includes('youtube.com') ? 'youtube' : src.includes('vimeo.com') ? 'vimeo' : 'video';
    return { type: 'media', mediaType, url: src, isShorts };
  },
  A: (el) => ({ type: 'link', url: el.getAttribute('href') || '' }),
};

const TEXT_TAGS: Record<string, () => any> = {
  STRONG: () => ({ bold: true }),
  B: () => ({ bold: true }),
  EM: () => ({ italic: true }),
  I: () => ({ italic: true }),
  U: () => ({ underline: true }),
  S: () => ({ strikethrough: true }),
  STRIKE: () => ({ strikethrough: true }),
  SUP: () => ({ superscript: true }),
  SUB: () => ({ subscript: true }),
};

// ─── DESERIALIZER ─────────────────────────────────────────────────────────────
export const deserialize = (el: HTMLElement | ChildNode): any => {
  if (el.nodeType === 3) return el.textContent === '\n' ? null : { text: el.textContent };
  if (el.nodeType !== 1) return null;
  if (el.nodeName === 'BR') return { text: '\n' };

  const htmlEl = el as HTMLElement;

  if (htmlEl.classList.contains('tempo-grey-box'))
    return { type: 'grey-box', children: Array.from(htmlEl.childNodes).map(deserialize).flat().filter(Boolean) };
  if (htmlEl.classList.contains('tempo-dropcap'))
    return { 'tempo-dropcap': true, text: htmlEl.textContent || '' };
  if (htmlEl.classList.contains('tempo-red-dot'))
    return { 'tempo-red-dot': true, text: htmlEl.textContent || '' };
  if (htmlEl.classList.contains('tempo-three-dots'))
    return { type: 'three-dots', children: [{ text: '' }] };

  const { nodeName } = htmlEl;
  let children = Array.from(htmlEl.childNodes).map(deserialize).flat().filter(Boolean);
  if (children.length === 0) children = [{ text: '' }];
  if (nodeName === 'BODY') return children;

  if (ELEMENT_TAGS[nodeName]) {
    const attrs = ELEMENT_TAGS[nodeName](htmlEl);
    if (attrs.type === 'media') return { ...attrs, children: [{ text: '' }] };
    return { ...attrs, children };
  }

  if (TEXT_TAGS[nodeName]) {
    const attrs = TEXT_TAGS[nodeName]();
    const applyMarks = (nodes: any[]): any[] =>
      nodes.map(n => n.text !== undefined ? { ...n, ...attrs } : n.children ? { ...n, children: applyMarks(n.children) } : n);
    return applyMarks(children);
  }

  return children;
};

// ─── SERIALIZER ────────────────────────────────────────────────────────────────
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const serialize = (node: Node): string => {
  if (Text.isText(node)) {
    let s = esc(node.text);
    if (s === '\n') return '<br/>';
    if (node.bold) s = `<strong>${s}</strong>`;
    if (node.italic) s = `<em>${s}</em>`;
    if (node.underline) s = `<u>${s}</u>`;
    if (node.strikethrough) s = `<s>${s}</s>`;
    if (node.superscript) s = `<sup>${s}</sup>`;
    if (node.subscript) s = `<sub>${s}</sub>`;
    if (node['tempo-dropcap']) s = `<span class="tempo-dropcap">${s}</span>`;
    if (node['tempo-red-dot']) s = `<span class="tempo-red-dot">${s}</span>`;
    return s;
  }

  const ch = (node as any).children?.map((n: Node) => serialize(n)).join('') ?? '';
  const n = node as any;
  switch (n.type) {
    case 'paragraph': return `<p>${ch}</p>`;
    case 'heading-one': return `<h1>${ch}</h1>`;
    case 'heading-two': return `<h2>${ch}</h2>`;
    case 'heading-three': return `<h3>${ch}</h3>`;
    case 'heading-four': return `<h4>${ch}</h4>`;
    case 'heading-five': return `<h5>${ch}</h5>`;
    case 'block-quote': return `<blockquote>${ch}</blockquote>`;
    case 'bulleted-list': return `<ul>${ch}</ul>`;
    case 'numbered-list': return `<ol>${ch}</ol>`;
    case 'list-item': return `<li>${ch}</li>`;
    case 'grey-box': return `<div class="tempo-grey-box">${ch}</div>`;
    case 'three-dots': return `<div class="tempo-three-dots">\u2022\u2022\u2022</div>`;
    case 'table': return `<table>${ch}</table>`;
    case 'table-row': return `<tr>${ch}</tr>`;
    case 'table-cell': return `<td>${ch}</td>`;
    case 'link': return `<a href="${n.url}">${ch}</a>`;
    case 'media': {
      if (n.mediaType === 'image') return `<img src="${n.url}" alt="" style="max-width:100%" />`;
      if (n.mediaType === 'video') return `<video src="${n.url}" controls style="max-width:100%;height:auto"></video>`;
      const style = n.isShorts ? 'width:100%;aspect-ratio:9/16;max-height:500px' : 'width:100%;aspect-ratio:16/9';
      const ds = n.isShorts ? ' data-shorts="true"' : '';
      return `<iframe src="${n.url}" style="${style}" frameborder="0" allowfullscreen${ds}></iframe>`;
    }
    default: return ch;
  }
};

// ─── EDITOR PLUGINS ───────────────────────────────────────────────────────────
const withCustomNodes = (editor: Editor) => {
  const { isVoid, isInline } = editor;
  editor.isVoid = (element: any) => ['media', 'three-dots'].includes(element.type) ? true : isVoid(element);
  editor.isInline = (element: any) => element.type === 'link' ? true : isInline(element);
  return editor;
};

const withPlainTextPaste = (editor: Editor) => {
  const { insertData } = editor;
  editor.insertData = (data: DataTransfer) => {
    const text = data.getData('text/plain');
    if (text) {
      const lines = text.split('\n');
      lines.forEach((line, i) => {
        if (i > 0) Transforms.splitNodes(editor, { always: true });
        editor.insertText(line);
      });
    } else {
      insertData(data);
    }
  };
  return editor;
};

// ─── CORE UTILS ───────────────────────────────────────────────────────────────
const LIST_TYPES = ['numbered-list', 'bulleted-list'];

const isBlockActive = (editor: Editor, format: string) => {
  const { selection } = editor;
  if (!selection) return false;
  const [match] = Array.from(Editor.nodes(editor, {
    at: Editor.unhangRange(editor, selection),
    match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === format,
  }));
  return !!match;
};

const isMarkActive = (editor: Editor, format: string) => {
  const marks = Editor.marks(editor);
  return marks ? (marks as any)[format] === true : false;
};

const getCurrentBlockType = (editor: Editor) => {
  const { selection } = editor;
  if (!selection) return 'paragraph';
  const excludedTypes = [...LIST_TYPES, 'list-item', 'table', 'table-row', 'table-cell', 'grey-box'];
  const [match] = Array.from(Editor.nodes(editor, {
    at: Editor.unhangRange(editor, selection),
    match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && !excludedTypes.includes((n as any).type),
  }));
  return match ? (match[0] as any).type : 'paragraph';
};

const toggleBlock = (editor: Editor, format: string) => {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);

  if (format === 'grey-box') {
    if (isActive) {
      Transforms.unwrapNodes(editor, {
        match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'grey-box',
        split: true,
      });
    } else {
      Transforms.wrapNodes(editor, { type: 'grey-box', children: [] } as any);
    }
    return;
  }

  Transforms.unwrapNodes(editor, {
    match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && LIST_TYPES.includes(n.type),
    split: true,
  });
  const newType = isActive ? 'paragraph' : isList ? 'list-item' : format;
  Transforms.setNodes<CustomElement>(editor, { type: newType });
  if (!isActive && isList) {
    Transforms.wrapNodes(editor, { type: format, children: [] } as any);
  }
};

const toggleMark = (editor: Editor, format: string) => {
  if (isMarkActive(editor, format)) Editor.removeMark(editor, format);
  else Editor.addMark(editor, format, true);
};

const insertTable = (editor: Editor) => {
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
const detectMediaType = (url: string): MediaType => {
  const lower = url.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/.test(lower)) return 'image';
  if (/\.(mp4|webm|ogg)(\?.*)?$/.test(lower)) return 'video';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('vimeo.com')) return 'vimeo';
  return 'image';
};

const buildEmbedUrl = (url: string, mediaType: MediaType) => {
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

// ─── PARSE HTML → SLATE ───────────────────────────────────────────────────────
const parseHtmlToSlate = (html: string): any[] => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const parsed = deserialize(doc.body);
  const nodes = Array.isArray(parsed) ? parsed : [parsed];
  const normalized: any[] = [];
  let pool: any[] = [];
  const flush = () => {
    if (pool.length > 0) {
      normalized.push({ type: 'paragraph', children: pool });
      pool = [];
    }
  };
  nodes.flat(Infinity).filter(Boolean).forEach((node: any) => {
    if (node.text !== undefined) {
      pool.push(node);
    } else if (node.type) {
      flush();
      if (!node.children || node.children.length === 0) node.children = [{ text: '' }];
      normalized.push(node);
    }
  });
  flush();
  return normalized.length > 0 ? normalized : [{ type: 'paragraph', children: [{ text: '' }] }];
};

// ─── COUNTS ───────────────────────────────────────────────────────────────────
const getPlainText = (nodes: Descendant[]) => nodes.map(n => Node.string(n)).join('\n');
const countWords = (text: string) => text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length;

// ─── LINK CONTEXT ───────────────────────────────────────────────────────────
interface LinkContextValue {
  onEditLink: (element: any, path: any) => void;
  onRemoveLink: (path: any) => void;
}
const LinkContext = React.createContext<LinkContextValue>({
  onEditLink: () => {},
  onRemoveLink: () => {},
});

// ─── REACT COMPONENTS ─────────────────────────────────────────────────────────
const Element = ({ attributes, children, element }: any) => {
  const selected = useSelected();
  const focused = useFocused();
  const isVoidSelected = selected && focused;
  switch (element.type) {
    case 'block-quote': return <blockquote className="slate-blockquote" {...attributes}>{children}</blockquote>;
    case 'bulleted-list': return <ul className="slate-ul" {...attributes}>{children}</ul>;
    case 'heading-one': return <h1 className="slate-h1" {...attributes}>{children}</h1>;
    case 'heading-two': return <h2 className="slate-h2" {...attributes}>{children}</h2>;
    case 'heading-three': return <h3 className="slate-h3" {...attributes}>{children}</h3>;
    case 'heading-four': return <h4 className="slate-h4" {...attributes}>{children}</h4>;
    case 'heading-five': return <h5 className="slate-h5" {...attributes}>{children}</h5>;
    case 'list-item': return <li className="slate-li" {...attributes}>{children}</li>;
    case 'numbered-list': return <ol className="slate-ol" {...attributes}>{children}</ol>;
    case 'grey-box': return <div className="tempo-grey-box" {...attributes}>{children}</div>;
    case 'three-dots':
      return (
        <div
          className={`tempo-three-dots ${isVoidSelected ? 'ring-2 ring-blue-500 ring-offset-1 rounded' : ''}`}
          {...attributes}
        >
          <span contentEditable={false}>&bull;&bull;&bull;</span>
          {children}
        </div>
      );
    case 'table': return <table className="slate-table" {...attributes}><tbody>{children}</tbody></table>;
    case 'table-row': return <tr {...attributes}>{children}</tr>;
    case 'table-cell': return <td className="slate-td" {...attributes}>{children}</td>;
    case 'link': {
      const { onEditLink, onRemoveLink } = React.useContext(LinkContext);
      return (
        <span {...attributes} style={{ display: 'inline', position: 'relative' }}>
          <a href={element.url} className="slate-link" onClick={e => e.preventDefault()}>
            {children}
          </a>
          {selected && focused && (
            <span
              contentEditable={false}
              className="absolute bottom-full left-0 mb-1 flex items-center gap-1 bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-600 shadow-lg rounded px-2 py-1 z-50 whitespace-nowrap"
              style={{ fontSize: '11px' }}
            >
              <span className="text-gray-500 dark:text-gray-400 max-w-[140px] truncate">{element.url}</span>
              <span className="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-1" />
              <button type="button" onMouseDown={e => { e.preventDefault(); onEditLink(element, null); }} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
              <span className="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-1" />
              <button type="button" onMouseDown={e => { e.preventDefault(); onRemoveLink(null); }} className="text-red-500 hover:text-red-700 font-medium">Hapus</button>
            </span>
          )}
        </span>
      );
    }
    case 'media': {
      const { url, mediaType, isShorts } = element;
      return (
        <div
          {...attributes}
          contentEditable={false}
          className={`slate-media ${isVoidSelected ? 'ring-2 ring-blue-500 ring-offset-1 rounded' : ''}`}
        >
          {mediaType === 'image' && <img src={url} alt="" className="slate-media-img" />}
          {mediaType === 'video' && <video src={url} controls className="slate-media-video" />}
          {(mediaType === 'youtube' || mediaType === 'vimeo') && (
            <iframe
              src={url}
              className={isShorts ? 'slate-media-shorts' : 'slate-media-iframe'}
              frameBorder="0"
              allowFullScreen
            />
          )}
          <div className="hidden">{children}</div>
        </div>
      );
    }
    default: return <p className="slate-p" {...attributes}>{children}</p>;
  }
};

const Leaf = ({ attributes, children, leaf }: any) => {
  if (leaf.bold) children = <strong>{children}</strong>;
  if (leaf.italic) children = <em>{children}</em>;
  if (leaf.underline) children = <u>{children}</u>;
  if (leaf.strikethrough) children = <s>{children}</s>;
  if (leaf.superscript) children = <sup>{children}</sup>;
  if (leaf.subscript) children = <sub>{children}</sub>;
  if (leaf['tempo-dropcap']) children = <span className="tempo-dropcap">{children}</span>;
  if (leaf['tempo-red-dot']) children = <span className="tempo-red-dot">{children}</span>;
  return <span {...attributes}>{children}</span>;
};

const Btn = ({ icon: Icon, isActive, onClick, disabled, title }: any) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    className={`p-2 transition-colors border border-gray-300 dark:border-gray-600 disabled:opacity-50
      ${isActive
        ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white'
        : 'bg-white dark:bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300'
      }`}
  >
    <Icon size={16} />
  </button>
);

const Sep = () => <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-0.5" />;

// ─── LINK MODAL ───────────────────────────────────────────────────────────
interface LinkModalProps {
  initialText?: string;
  initialUrl?: string;
  isEdit?: boolean;
  onInsert: (text: string, url: string) => void;
  onClose: () => void;
}

const LinkModal = ({ initialText = '', initialUrl = '', isEdit = false, onInsert, onClose }: LinkModalProps) => {
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState(initialUrl);

  const handleInsert = () => {
    if (!url.trim()) return;
    onInsert(text || url, url.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">{isEdit ? 'Edit Link' : 'Insert Link'}</h3>
          <button type="button" title="Tutup" onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teks yang ditampilkan</label>
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Mis: Kunjungi situs kami"
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInsert()}
              placeholder="https://..."
              autoFocus
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t dark:border-gray-700">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Batal</button>
          <button type="button" onClick={handleInsert} disabled={!url.trim()} className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">{isEdit ? 'Simpan' : 'Sisipkan Link'}</button>
        </div>
      </div>
    </div>
  );
};

// ─── EMBED MODAL ──────────────────────────────────────────────────────────────
interface EmbedModalProps {
  title: string;
  hint: string;
  onInsert: (embedUrl: string, mediaType: MediaType, isShorts: boolean) => void;
  onClose: () => void;
}

const EmbedModal = ({ title, hint, onInsert, onClose }: EmbedModalProps) => {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<{ mediaType: MediaType; embedUrl: string; isShorts: boolean } | null>(null);

  const handlePreview = () => {
    if (!url.trim()) return;
    const mediaType = detectMediaType(url.trim());
    const { embedUrl, isShorts } = buildEmbedUrl(url.trim(), mediaType);
    setPreview({ mediaType, embedUrl, isShorts });
  };

  const handleInsert = () => {
    if (!url.trim()) return;
    const source = preview ?? (() => {
      const mediaType = detectMediaType(url.trim());
      const { embedUrl, isShorts } = buildEmbedUrl(url.trim(), mediaType);
      return { mediaType, embedUrl, isShorts };
    })();
    onInsert(source.embedUrl, source.mediaType, source.isShorts);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button type="button" title="Tutup" onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePreview()}
                placeholder="https://..."
                autoFocus
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button type="button" onClick={handlePreview} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">Preview</button>
            </div>
            <p className="text-xs text-gray-500 mt-1">{hint}</p>
          </div>
          {preview && (
            <div className="border dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 p-2">
              {preview.mediaType === 'image' && <img src={preview.embedUrl} alt="" className="max-w-full max-h-48 object-contain mx-auto rounded" />}
              {preview.mediaType === 'video' && <video src={preview.embedUrl} controls className="max-w-full max-h-48 mx-auto rounded" />}
              {(preview.mediaType === 'youtube' || preview.mediaType === 'vimeo') && (
                <iframe src={preview.embedUrl} className={`w-full rounded border-none ${preview.isShorts ? 'h-64' : 'h-48'}`} allowFullScreen />
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t dark:border-gray-700">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Batal</button>
          <button type="button" onClick={handleInsert} disabled={!url.trim()} className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">Sisipkan</button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export interface SlateTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onMetaChange?: (meta: { wordCount: number; charCount: number }) => void;
  disabled?: boolean;
}

const HEADING_TYPES = [
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'heading-one', label: 'Heading 1' },
  { value: 'heading-two', label: 'Heading 2' },
  { value: 'heading-three', label: 'Heading 3' },
  { value: 'heading-four', label: 'Heading 4' },
  { value: 'heading-five', label: 'Heading 5' },
];

const HOTKEYS: Record<string, string> = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
};

export function SlateTextEditor({
  value,
  onChange,
  onMetaChange,
  disabled = false,
}: SlateTextEditorProps) {
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [showEmbedPhotoModal, setShowEmbedPhotoModal] = useState(false);
  const [showEmbedVideoModal, setShowEmbedVideoModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingLink, setEditingLink] = useState<{ text: string; url: string } | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [blockType, setBlockType] = useState('paragraph');
  const [, forceUpdate] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  const editor = useMemo(() => withCustomNodes(withPlainTextPaste(withHistory(withReact(createEditor())))), []);
  const initialValue = useMemo<Descendant[]>(() => [{ type: 'paragraph', children: [{ text: '' }] } as any], []);
  const savedSelectionRef = useRef<any>(null);

  useEffect(() => {
    if (!initializedRef.current && value && value.trim() !== '' && value !== '<p></p>') {
      initializedRef.current = true;
      const nodes = parseHtmlToSlate(value);
      editor.children = nodes as any;
      editor.onChange();
      // Initialize counts from loaded value
      const text = nodes.map((n: any) => Node.string(n)).join('\n');
      setWordCount(text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length);
      setCharCount(text.length);
    }
  }, [value, editor]);

  const updateCounts = useCallback((nodes: Descendant[]) => {
    const text = getPlainText(nodes);
    const wc = countWords(text);
    const cc = text.length;
    setWordCount(wc);
    setCharCount(cc);
    onMetaChange?.({ wordCount: wc, charCount: cc });
  }, [onMetaChange]);

  const handleChange = useCallback((val: Descendant[]) => {
    // Always force re-render so toolbar active states stay in sync with selection
    forceUpdate(x => x + 1);
    const isAstChange = editor.operations.some((op: any) => op.type !== 'set_selection');
    if (isAstChange) {
      onChange(val.map(n => serialize(n)).join(''));
      updateCounts(val);
    }
    setBlockType(getCurrentBlockType(editor));
  }, [editor, onChange, updateCounts]);

  const handleLinkInsert = (text: string, url: string) => {
    if (savedSelectionRef.current) {
      Transforms.select(editor, savedSelectionRef.current);
    }
    if (editingLink) {
      // Update all link nodes at current selection
      const [linkEntry] = Editor.nodes(editor, {
        match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === 'link',
      });
      if (linkEntry) {
        Transforms.setNodes(editor, { url } as any, { at: linkEntry[1] });
      }
      setEditingLink(null);
    } else {
      const { selection } = editor;
      if (selection && !Range.isCollapsed(selection)) {
        Transforms.wrapNodes(editor, { type: 'link', url, children: [] } as any, { split: true });
      } else {
        Transforms.insertNodes(editor, { type: 'link', url, children: [{ text }] } as any);
      }
    }
  };

  const openLinkModal = () => {
    savedSelectionRef.current = editor.selection;
    setEditingLink(null);
    setShowLinkModal(true);
  };

  const onEditLink = (element: any) => {
    savedSelectionRef.current = editor.selection;
    setEditingLink({ text: Node.string(element), url: element.url });
    setShowLinkModal(true);
  };

  const onRemoveLink = () => {
    const [linkEntry] = Editor.nodes(editor, {
      match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === 'link',
    });
    if (linkEntry) {
      Transforms.unwrapNodes(editor, { at: linkEntry[1] });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const mediaType: MediaType = file.type.startsWith('video/') ? 'video' : 'image';
    Transforms.insertNodes(editor, { type: 'media', mediaType, url, isShorts: false, children: [{ text: '' }] } as any);
    Transforms.insertNodes(editor, { type: 'paragraph', children: [{ text: '' }] } as any);
    e.target.value = '';
  };

  const handleEmbedInsert = (embedUrl: string, mediaType: MediaType, isShorts: boolean) => {
    Transforms.insertNodes(editor, { type: 'media', mediaType, url: embedUrl, isShorts, children: [{ text: '' }] } as any);
    Transforms.insertNodes(editor, { type: 'paragraph', children: [{ text: '' }] } as any);
  };

  const renderElement = useCallback((p: any) => <Element {...p} />, []);
  const renderLeaf = useCallback((p: any) => <Leaf {...p} />, []);

  return (
    <LinkContext.Provider value={{ onEditLink, onRemoveLink }}>
    <div className={`border border-gray-300 dark:border-gray-600 rounded focus-within:ring-2 focus-within:ring-red-500 focus-within:border-transparent ${disabled ? 'bg-gray-100 dark:bg-gray-700 opacity-75' : 'bg-white dark:bg-gray-800'}`}>
      {showEmbedPhotoModal && (
        <EmbedModal
          title="Embed Foto"
          hint="Mendukung: jpg, png, gif, webp"
          onInsert={handleEmbedInsert}
          onClose={() => setShowEmbedPhotoModal(false)}
        />
      )}
      {showEmbedVideoModal && (
        <EmbedModal
          title="Embed Video"
          hint="Mendukung: mp4, webm, YouTube, Vimeo (termasuk YouTube Shorts)"
          onInsert={handleEmbedInsert}
          onClose={() => setShowEmbedVideoModal(false)}
        />
      )}
      {showLinkModal && (
        <LinkModal
          initialText={editingLink?.text ?? (editor.selection && !Range.isCollapsed(editor.selection) ? Editor.string(editor, editor.selection) : '')}
          initialUrl={editingLink?.url ?? ''}
          isEdit={!!editingLink}
          onInsert={handleLinkInsert}
          onClose={() => { setShowLinkModal(false); setEditingLink(null); }}
        />
      )}
      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />

      <Slate editor={editor} initialValue={initialValue} onChange={handleChange}>
        {/* TOOLBAR */}
        <div className="flex items-center gap-0.5 p-2 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 flex-wrap rounded-t">

          {/* Heading Selector */}
          <select
            title="Jenis Teks"
            value={blockType}
            disabled={disabled}
            onChange={e => { ReactEditor.focus(editor); toggleBlock(editor, e.target.value); }}
            className="h-[34px] px-2 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded mr-1 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            {HEADING_TYPES.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
          </select>

          <Btn title="Bold (Ctrl+B)" icon={Bold} isActive={isMarkActive(editor, 'bold')} onClick={() => toggleMark(editor, 'bold')} disabled={disabled} />
          <Btn title="Italic (Ctrl+I)" icon={Italic} isActive={isMarkActive(editor, 'italic')} onClick={() => toggleMark(editor, 'italic')} disabled={disabled} />
          <Btn title="Underline (Ctrl+U)" icon={UnderlineIcon} isActive={isMarkActive(editor, 'underline')} onClick={() => toggleMark(editor, 'underline')} disabled={disabled} />
          <Btn title="Strikethrough" icon={Strikethrough} isActive={isMarkActive(editor, 'strikethrough')} onClick={() => toggleMark(editor, 'strikethrough')} disabled={disabled} />
          <Sep />
          <Btn title="Superscript" icon={SuperscriptIcon} isActive={isMarkActive(editor, 'superscript')} onClick={() => toggleMark(editor, 'superscript')} disabled={disabled} />
          <Btn title="Subscript" icon={SubscriptIcon} isActive={isMarkActive(editor, 'subscript')} onClick={() => toggleMark(editor, 'subscript')} disabled={disabled} />
          <Sep />
          <Btn title="Bullet List" icon={List} isActive={isBlockActive(editor, 'bulleted-list')} onClick={() => toggleBlock(editor, 'bulleted-list')} disabled={disabled} />
          <Btn title="Numbered List" icon={ListOrdered} isActive={isBlockActive(editor, 'numbered-list')} onClick={() => toggleBlock(editor, 'numbered-list')} disabled={disabled} />
          <Btn title="Blockquote" icon={Quote} isActive={isBlockActive(editor, 'block-quote')} onClick={() => toggleBlock(editor, 'block-quote')} disabled={disabled} />
          <Btn title="Insert Table 3×3" icon={Table} isActive={false} onClick={() => insertTable(editor)} disabled={disabled} />
          <Sep />
          <Btn title="Insert Link" icon={Link} isActive={false} onClick={openLinkModal} disabled={disabled} />
          <Btn title="Embed Foto" icon={Image} isActive={false} onClick={() => setShowEmbedPhotoModal(true)} disabled={disabled} />
          <Btn title="Embed Video" icon={Film} isActive={false} onClick={() => setShowEmbedVideoModal(true)} disabled={disabled} />
          <Btn title="Tempo File (DAM)" icon={FolderOpen} isActive={false} onClick={() => fileInputRef.current?.click()} disabled={disabled} />
          <Sep />

          {/* Tempo Templates */}
          <div className="relative">
            <button
              type="button"
              title="Tempo Templates"
              disabled={disabled}
              onClick={() => setIsTemplateOpen(!isTemplateOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 disabled:opacity-50 flex items-center justify-center bg-white dark:bg-transparent min-w-[34px] min-h-[34px]"
            >
              <img src="/images/t-initial.png" alt="Tempo" className="w-[14px] h-[14px] object-contain" />
            </button>
            {isTemplateOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsTemplateOpen(false)} />
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-600 shadow-xl rounded-md z-50 min-w-48">
                  <button type="button" onClick={() => { toggleMark(editor, 'tempo-dropcap'); setIsTemplateOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 text-sm flex items-center gap-2">
                    <Type size={14} /> Drop Cap
                  </button>
                  <button type="button" onClick={() => { Transforms.insertNodes(editor, { type: 'paragraph', children: [{ 'tempo-red-dot': true, text: '● ' }] } as any); setIsTemplateOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 text-sm flex items-center gap-2">
                    <Circle size={10} className="text-red-600" fill="currentColor" /> Red Dot
                  </button>
                  <button type="button" onClick={() => { Transforms.insertNodes(editor, [{ type: 'three-dots', children: [{ text: '' }] } as any, { type: 'paragraph', children: [{ text: '' }] } as any]); setIsTemplateOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 text-sm flex items-center gap-2">
                    <MoreHorizontal size={14} /> Three Dots
                  </button>
                  <button type="button" onClick={() => { toggleBlock(editor, 'grey-box'); setIsTemplateOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 text-sm flex items-center gap-2">
                    <LayoutTemplate size={14} /> Grey Box
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* EDITABLE */}
        <Editable
          readOnly={disabled}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          className="w-full min-h-[300px] outline-none px-4 py-4 text-gray-900 dark:text-gray-100 leading-relaxed"
          onKeyDown={event => {
            // Hotkeys
            for (const hotkey in HOTKEYS) {
              if (isHotkey(hotkey, event as any)) {
                event.preventDefault();
                toggleMark(editor, HOTKEYS[hotkey]);
              }
            }

            // Clear link style on Enter (don't carry link to next line)
            if (event.key === 'Enter' && !event.shiftKey) {
              const { selection } = editor;
              if (selection && Range.isCollapsed(selection)) {
                const [linkEntry] = Editor.nodes(editor, {
                  match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === 'link',
                });
                if (linkEntry) {
                  event.preventDefault();
                  editor.insertBreak();
                  // Unwrap any link inline that carried over to new paragraph
                  const [newLink] = Editor.nodes(editor, {
                    match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === 'link',
                  });
                  if (newLink) Transforms.unwrapNodes(editor, { at: newLink[1] });
                  return;
                }
              }
            }

            // Clear tempo-red-dot mark on Enter (don't carry to next line)
            if (event.key === 'Enter' && !event.shiftKey) {
              if (isMarkActive(editor, 'tempo-red-dot')) {
                event.preventDefault();
                editor.insertBreak();
                Editor.removeMark(editor, 'tempo-red-dot');
                return;
              }
            }

            // Grey Box: Enter should stay inside, never exit
            if (event.key === 'Enter' && !event.shiftKey) {
              const { selection } = editor;
              if (selection && Range.isCollapsed(selection)) {
                const [greyBoxEntry] = Editor.nodes(editor, {
                  match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === 'grey-box',
                });
                if (greyBoxEntry) {
                  event.preventDefault();
                  editor.insertBreak();
                  return;
                }
              }
            }

            // Exit list on Enter in empty list item
            if (event.key === 'Enter' && !event.shiftKey) {
              const { selection } = editor;
              if (selection && Range.isCollapsed(selection)) {
                const [listItem] = Editor.nodes(editor, {
                  match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === 'list-item',
                });
                if (listItem && Node.string(listItem[0]) === '') {
                  event.preventDefault();
                  Transforms.unwrapNodes(editor, {
                    match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && LIST_TYPES.includes((n as any).type),
                    split: true,
                  });
                  Transforms.setNodes(editor, { type: 'paragraph' } as any);
                }
              }
            }

            // Backspace in empty list item removes list style
            if (event.key === 'Backspace') {
              const { selection } = editor;
              if (selection && Range.isCollapsed(selection)) {
                const [listItem] = Editor.nodes(editor, {
                  match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === 'list-item',
                });
                if (listItem) {
                  const [node, path] = listItem;
                  const start = Editor.start(editor, path);
                  if (Point.equals(selection.anchor, start) && Node.string(node) === '') {
                    event.preventDefault();
                    Transforms.unwrapNodes(editor, {
                      match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && LIST_TYPES.includes((n as any).type),
                      split: true,
                    });
                    Transforms.setNodes(editor, { type: 'paragraph' } as any);
                  }
                }
              }
            }
          }}
        />
      </Slate>

      {/* WORD / CHAR COUNT */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-b">
        <span>{wordCount} <span className="font-semibold text-gray-700 dark:text-gray-300">Words</span></span>
        <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
        <span>{charCount} <span className="font-semibold text-gray-700 dark:text-gray-300">Alphabet (Chars)</span></span>
      </div>

      <style>{`
        .slate-p { margin: 0.4rem 0; font-size: 1rem; font-weight: 400; }
        .slate-h1 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; line-height: 1.2; }
        .slate-h2 { font-size: 1.25rem; font-weight: 700; margin: 0.875rem 0 0.5rem; line-height: 1.3; }
        .slate-h3 { font-size: 1.125rem; font-weight: 700; margin: 0.75rem 0 0.5rem; line-height: 1.4; }
        .slate-h4 { font-size: 0.75rem; font-weight: 600; margin: 0.75rem 0 0.25rem; }
        .slate-h5 { font-size: 0.625rem; font-weight: 600; margin: 0.5rem 0 0.25rem; }
        .slate-ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        .slate-ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        .slate-li { margin: 0.2rem 0; }
        .slate-blockquote { border-left: 4px solid #d1d5db; padding-left: 1rem; margin: 0.75rem 0; color: #6b7280; font-style: italic; }
        .slate-table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
        .slate-td { border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; vertical-align: top; min-width: 80px; }
        .slate-media { margin: 1rem 0; }
        .slate-media-img { max-width: 100%; height: auto; border-radius: 4px; display: block; }
        .slate-media-video { max-width: 100%; height: auto; border-radius: 4px; display: block; }
        .slate-media-iframe { width: 100%; aspect-ratio: 16/9; border-radius: 4px; border: none; display: block; }
        .slate-media-shorts { width: 100%; max-width: 280px; aspect-ratio: 9/16; border-radius: 4px; border: none; display: block; }
        .tempo-grey-box { background-color: #f3f4f6; padding: 1.25rem; border-left: 4px solid #ef4444; margin: 1.5rem 0; border-radius: 4px; }
        .tempo-grey-box > *:first-child { font-weight: bold; color: #ef4444; font-size: 1.125rem; margin-bottom: 0.5rem; }
        .tempo-dropcap { float: left; font-size: 4rem; line-height: 3.5rem; margin-right: 0.5rem; font-weight: bold; color: #000; }
        .tempo-red-dot { color: #ef4444; font-weight: 900; font-size: 1.25em; }
        .tempo-three-dots { text-align: center; font-size: 2rem; font-weight: bold; margin: 24px 0; color: #000; user-select: none; }
        .slate-link { color: #2563eb; text-decoration: underline; cursor: pointer; }
      `}</style>
    </div>
    </LinkContext.Provider>
  );
}
