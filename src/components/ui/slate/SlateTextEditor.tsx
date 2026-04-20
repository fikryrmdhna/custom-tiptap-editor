import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { createEditor, Editor, Element as SlateElement, Transforms, Node, Range, Point } from 'slate';
import type { Descendant } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import isHotkey from 'is-hotkey';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
  List, ListOrdered, Quote, LayoutTemplate,
  Type, Circle, MoreHorizontal, Link, Table, FolderOpen, Film, Image,
} from 'lucide-react';

import { parseHtmlToSlate, serialize } from './serializer';
import { withCustomNodes, withPlainTextPaste } from './plugins';
import {
  LIST_TYPES, isBlockActive, isMarkActive, getCurrentBlockType,
  toggleBlock, toggleMark, insertTable,
  getPlainText, countWords,
} from './utils';
import { LinkContext } from './context';
import { SlateElement as SlateElementComponent } from './components/SlateElement';
import { SlateLeaf } from './components/SlateLeaf';
import { SlateBtn, SlateSep } from './components/SlateBtn';
import { LinkModal } from './components/LinkModal';
import { EmbedModal } from './components/EmbedModal';
import type { MediaType } from './types';

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
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

// ─── STYLES ────────────────────────────────────────────────────────────────────
const EDITOR_STYLES = `
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
`;

// ─── PROPS ─────────────────────────────────────────────────────────────────────
export interface SlateTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onMetaChange?: (meta: { wordCount: number; charCount: number }) => void;
  disabled?: boolean;
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
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
  const savedSelectionRef = useRef<any>(null);

  const editor = useMemo(() => withCustomNodes(withPlainTextPaste(withHistory(withReact(createEditor())))), []);
  const initialValue = useMemo<Descendant[]>(() => [{ type: 'paragraph', children: [{ text: '' }] } as any], []);

  // ─── INIT FROM HTML VALUE ─────────────────────────────────────────────────
  useEffect(() => {
    if (!initializedRef.current && value && value.trim() !== '' && value !== '<p></p>') {
      initializedRef.current = true;
      const nodes = parseHtmlToSlate(value);
      editor.children = nodes as any;
      editor.onChange();
      const text = nodes.map((n: any) => Node.string(n)).join('\n');
      setWordCount(text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length);
      setCharCount(text.length);
    }
  }, [value, editor]);

  // ─── HANDLERS ─────────────────────────────────────────────────────────────
  const updateCounts = useCallback((nodes: Descendant[]) => {
    const text = getPlainText(nodes);
    const wc = countWords(text);
    const cc = text.length;
    setWordCount(wc);
    setCharCount(cc);
    onMetaChange?.({ wordCount: wc, charCount: cc });
  }, [onMetaChange]);

  const handleChange = useCallback((val: Descendant[]) => {
    forceUpdate(x => x + 1);
    const isAstChange = editor.operations.some((op: any) => op.type !== 'set_selection');
    if (isAstChange) {
      onChange(val.map(n => serialize(n)).join(''));
      updateCounts(val);
    }
    setBlockType(getCurrentBlockType(editor));
  }, [editor, onChange, updateCounts]);

  const handleLinkInsert = (text: string, url: string) => {
    if (savedSelectionRef.current) Transforms.select(editor, savedSelectionRef.current);
    if (editingLink) {
      const [linkEntry] = Editor.nodes(editor, {
        match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === 'link',
      });
      if (linkEntry) Transforms.setNodes(editor, { url } as any, { at: linkEntry[1] });
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
    if (linkEntry) Transforms.unwrapNodes(editor, { at: linkEntry[1] });
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

  const renderElement = useCallback((p: any) => <SlateElementComponent {...p} />, []);
  const renderLeaf = useCallback((p: any) => <SlateLeaf {...p} />, []);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <LinkContext.Provider value={{ onEditLink, onRemoveLink }}>
      <div className={`border border-gray-300 dark:border-gray-600 rounded focus-within:ring-2 focus-within:ring-red-500 focus-within:border-transparent ${disabled ? 'bg-gray-100 dark:bg-gray-700 opacity-75' : 'bg-white dark:bg-gray-800'}`}>
        {/* Modals */}
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

            <SlateBtn title="Bold (Ctrl+B)" icon={Bold} isActive={isMarkActive(editor, 'bold')} onClick={() => toggleMark(editor, 'bold')} disabled={disabled} />
            <SlateBtn title="Italic (Ctrl+I)" icon={Italic} isActive={isMarkActive(editor, 'italic')} onClick={() => toggleMark(editor, 'italic')} disabled={disabled} />
            <SlateBtn title="Underline (Ctrl+U)" icon={UnderlineIcon} isActive={isMarkActive(editor, 'underline')} onClick={() => toggleMark(editor, 'underline')} disabled={disabled} />
            <SlateBtn title="Strikethrough" icon={Strikethrough} isActive={isMarkActive(editor, 'strikethrough')} onClick={() => toggleMark(editor, 'strikethrough')} disabled={disabled} />
            <SlateSep />
            <SlateBtn title="Superscript" icon={SuperscriptIcon} isActive={isMarkActive(editor, 'superscript')} onClick={() => toggleMark(editor, 'superscript')} disabled={disabled} />
            <SlateBtn title="Subscript" icon={SubscriptIcon} isActive={isMarkActive(editor, 'subscript')} onClick={() => toggleMark(editor, 'subscript')} disabled={disabled} />
            <SlateSep />
            <SlateBtn title="Bullet List" icon={List} isActive={isBlockActive(editor, 'bulleted-list')} onClick={() => toggleBlock(editor, 'bulleted-list')} disabled={disabled} />
            <SlateBtn title="Numbered List" icon={ListOrdered} isActive={isBlockActive(editor, 'numbered-list')} onClick={() => toggleBlock(editor, 'numbered-list')} disabled={disabled} />
            <SlateBtn title="Blockquote" icon={Quote} isActive={isBlockActive(editor, 'block-quote')} onClick={() => toggleBlock(editor, 'block-quote')} disabled={disabled} />
            <SlateBtn title="Insert Table 3×3" icon={Table} isActive={false} onClick={() => insertTable(editor)} disabled={disabled} />
            <SlateSep />
            <SlateBtn title="Insert Link" icon={Link} isActive={false} onClick={openLinkModal} disabled={disabled} />
            <SlateBtn title="Embed Foto" icon={Image} isActive={false} onClick={() => setShowEmbedPhotoModal(true)} disabled={disabled} />
            <SlateBtn title="Embed Video" icon={Film} isActive={false} onClick={() => setShowEmbedVideoModal(true)} disabled={disabled} />
            <SlateBtn title="Tempo File (DAM)" icon={FolderOpen} isActive={false} onClick={() => fileInputRef.current?.click()} disabled={disabled} />
            <SlateSep />

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

              // Clear link style on Enter
              if (event.key === 'Enter' && !event.shiftKey) {
                const { selection } = editor;
                if (selection && Range.isCollapsed(selection)) {
                  const [linkEntry] = Editor.nodes(editor, {
                    match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === 'link',
                  });
                  if (linkEntry) {
                    event.preventDefault();
                    editor.insertBreak();
                    const [newLink] = Editor.nodes(editor, {
                      match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === 'link',
                    });
                    if (newLink) Transforms.unwrapNodes(editor, { at: newLink[1] });
                    return;
                  }
                }
              }

              // Clear tempo-red-dot on Enter
              if (event.key === 'Enter' && !event.shiftKey) {
                if (isMarkActive(editor, 'tempo-red-dot')) {
                  event.preventDefault();
                  editor.insertBreak();
                  Editor.removeMark(editor, 'tempo-red-dot');
                  return;
                }
              }

              // Grey Box: Enter stays inside
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

        <style>{EDITOR_STYLES}</style>
      </div>
    </LinkContext.Provider>
  );
}
