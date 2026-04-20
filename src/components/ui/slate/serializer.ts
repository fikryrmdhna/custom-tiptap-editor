import { Text, Node } from 'slate';
import type { MediaType } from './types';

// ─── HTML ELEMENT → SLATE NODE MAP ────────────────────────────────────────────
export const ELEMENT_TAGS: Record<string, (el: HTMLElement) => any> = {
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

export const TEXT_TAGS: Record<string, () => any> = {
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

// ─── SERIALIZER ───────────────────────────────────────────────────────────────
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

// ─── HTML → SLATE NODES ───────────────────────────────────────────────────────
export const parseHtmlToSlate = (html: string): any[] => {
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
