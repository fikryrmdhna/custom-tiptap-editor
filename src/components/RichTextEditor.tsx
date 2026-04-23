import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Superscript } from '@tiptap/extension-superscript';
import { Subscript } from '@tiptap/extension-subscript';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Link } from '@tiptap/extension-link';
import { Image as TiptapImage } from '@tiptap/extension-image';
import { Youtube } from '@tiptap/extension-youtube';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

// Custom Tempo Templates
import { Video, ThreeBlackDots, TempoGreyBox, TempoDropCap, TempoRedDot } from './tiptap/TempoExtensions';

import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
  List, ListOrdered, Quote,
  Database, Type, Circle, MoreHorizontal, LayoutTemplate,
  Table as TableIcon, ExternalLink, ChevronDown,
} from 'lucide-react';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFileAttach?: () => void;
  disabled?: boolean;
}

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const BULLET_LIST_STYLES = [
  { value: 'disc', label: '● Default' },
  { value: 'circle', label: '○ Circle' },
  { value: 'square', label: '■ Square' },
];

const ORDERED_LIST_STYLES = [
  { value: 'decimal', label: 'Decimal (1, 2, 3)' },
  { value: 'lower-alpha', label: 'Lower Alpha (a, b, c)' },
  { value: 'upper-alpha', label: 'Upper Alpha (A, B, C)' },
  { value: 'lower-roman', label: 'Lower Roman (i, ii, iii)' },
  { value: 'upper-roman', label: 'Upper Roman (I, II, III)' },
];

const TABLE_MAX = 8;

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────────

function ToolbarDropdown({
  trigger,
  children,
  disabled,
  title,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-0.5 px-1.5 py-2 h-[34px] transition-colors border border-gray-300 dark:border-gray-600 bg-white dark:bg-transparent hover:bg-gray-200 hover:text-gray-900 dark:text-white dark:hover:bg-gray-700 disabled:opacity-50"
      >
        {trigger}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-xl rounded-md z-50 min-w-[170px]"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DropItem({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 ${active ? 'bg-gray-100 dark:bg-gray-700 font-semibold' : ''}`}
    >
      {children}
    </button>
  );
}

function TablePicker({ onPick, disabled }: { onPick: (rows: number, cols: number) => void; disabled?: boolean }) {
  const [hover, setHover] = useState<[number, number]>([0, 0]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Insert Table"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-0.5 p-2 h-[34px] transition-colors border border-gray-300 dark:border-gray-600 bg-white dark:bg-transparent hover:bg-gray-200 hover:text-gray-900 dark:text-white dark:hover:bg-gray-700 disabled:opacity-50"
      >
        <TableIcon size={16} />
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-xl rounded-md z-50 p-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 px-1 min-w-[100px]">
            {hover[0] > 0 ? `${hover[0]} × ${hover[1]}` : 'Pilih ukuran tabel'}
          </p>
          <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${TABLE_MAX}, 18px)` }}>
            {Array.from({ length: TABLE_MAX }, (_, r) =>
              Array.from({ length: TABLE_MAX }, (_, c) => (
                <div
                  key={`${r}-${c}`}
                  onMouseEnter={() => setHover([r + 1, c + 1])}
                  onMouseLeave={() => setHover([0, 0])}
                  onClick={() => {
                    onPick(r + 1, c + 1);
                    setOpen(false);
                    setHover([0, 0]);
                  }}
                  className={`w-4 h-4 border cursor-pointer rounded-sm transition-colors ${
                    r < hover[0] && c < hover[1]
                      ? 'bg-red-400 border-red-500'
                      : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-200'
                  }`}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Tulis di sini...',
  onFileAttach,
  disabled = false,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5] } }),
      Underline,
      Superscript,
      Subscript,
      Link.configure({ openOnClick: false }),
      TiptapImage,
      Youtube,
      CharacterCount,
      Placeholder.configure({ placeholder }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Video,
      ThreeBlackDots,
      TempoGreyBox,
      TempoDropCap,
      TempoRedDot,
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => { onChange(editor.getHTML()); },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none w-full min-h-[300px] outline-none relative px-4 py-4',
      },
    },
  });

  useEffect(() => { if (editor) editor.setEditable(!disabled); }, [editor, disabled]);

  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value);
  }, [editor, value]);

  const handleFileClick = () => {
    if (onFileAttach) onFileAttach();
    else fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editor) {
      editor.commands.insertContent(`<a href="#" class="text-blue-600 underline">${file.name}</a>`);
    }
  };

  const submitEmbed = () => {
    if (!embedUrl || !editor) return;
    const url = embedUrl.trim();
    if (url.match(/\.(jpeg|jpg|gif|png|webp|svg|heic|bmp)(\?.*)?$/i) || url.startsWith('data:image/')) {
      editor.chain().focus().setImage({ src: url }).run();
    } else if (url.match(/youtube\.com|youtu\.be/i)) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    } else if (url.match(/\.(mp4|mov|webm)$/i)) {
      editor.chain().focus().insertContent(`<video src="${url}" controls width="100%"></video>`).run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
    setIsEmbedModalOpen(false);
    setEmbedUrl('');
  };

  if (!editor) return null;

  const btnCls = (active: boolean) =>
    `p-2 h-[34px] hover:bg-gray-200 hover:text-gray-900 dark:text-white transition-colors border border-gray-300 dark:border-gray-600 disabled:opacity-50 ${active ? 'bg-gray-200 text-gray-900' : ''}`;

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded focus-within:ring-2 focus-within:ring-red-500 focus-within:border-transparent ${disabled ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}`}>

      {/* ── EMBED MODAL ── */}
      {isEmbedModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Embed Media</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL (Foto / YouTube / Video)
                </label>
                <input
                  type="url"
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://..."
                  value={embedUrl}
                  onChange={e => setEmbedUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitEmbed(); }}
                />
                <p className="text-xs text-gray-500 mt-1">Mendukung: foto (jpg/png/gif/webp), video (mp4/webm), YouTube, Vimeo</p>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsEmbedModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Batal</button>
                <button type="button" onClick={submitEmbed} className="px-4 py-2 rounded-md text-sm text-white bg-red-600 hover:bg-red-700">Embed</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TOOLBAR ── */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 transition-colors flex-wrap rounded-t">

        {/* Heading selector */}
        <select
          disabled={disabled}
          onChange={e => {
            const val = e.target.value;
            if (val === 'p') editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: parseInt(val.replace('h', '')) as any }).run();
          }}
          className="h-[34px] px-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none"
          value={
            editor.isActive('heading', { level: 1 }) ? 'h1' :
            editor.isActive('heading', { level: 2 }) ? 'h2' :
            editor.isActive('heading', { level: 3 }) ? 'h3' :
            editor.isActive('heading', { level: 4 }) ? 'h4' :
            editor.isActive('heading', { level: 5 }) ? 'h5' : 'p'
          }
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="h5">Heading 5</option>
        </select>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-0.5" />

        {/* ── FORMAT DROPDOWN ── */}
        <ToolbarDropdown
          title="Format"
          disabled={disabled}
          trigger={<span className="text-xs font-medium dark:text-gray-300">Format</span>}
        >
          <DropItem onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
            <Bold size={14} /> Bold
          </DropItem>
          <DropItem onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
            <Italic size={14} /> Italic
          </DropItem>
          <DropItem onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}>
            <UnderlineIcon size={14} /> Underline
          </DropItem>
          <DropItem onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}>
            <Strikethrough size={14} /> Strikethrough
          </DropItem>
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-0.5" />
          <DropItem onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')}>
            <SuperscriptIcon size={14} /> Superscript
          </DropItem>
          <DropItem onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')}>
            <SubscriptIcon size={14} /> Subscript
          </DropItem>
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-0.5" />
          <DropItem onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>
            <Quote size={14} /> Blockquote
          </DropItem>
        </ToolbarDropdown>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-0.5" />

        {/* ── BULLET LIST DROPDOWN ── */}
        <ToolbarDropdown title="Bullet List" disabled={disabled} trigger={<List size={16} />}>
          {BULLET_LIST_STYLES.map(s => (
            <DropItem
              key={s.value}
              active={editor.isActive('bulletList')}
              onClick={() => {
                editor.chain().focus().toggleBulletList().run();
                // Apply the list style type via DOM after toggle
                const { view } = editor;
                const uls = view.dom.querySelectorAll('ul');
                uls.forEach(ul => { (ul as HTMLElement).style.listStyleType = s.value; });
              }}
            >
              {s.label}
            </DropItem>
          ))}
        </ToolbarDropdown>

        {/* ── ORDERED LIST DROPDOWN ── */}
        <ToolbarDropdown title="Ordered List" disabled={disabled} trigger={<ListOrdered size={16} />}>
          {ORDERED_LIST_STYLES.map(s => (
            <DropItem
              key={s.value}
              active={editor.isActive('orderedList')}
              onClick={() => {
                editor.chain().focus().toggleOrderedList().run();
                const { view } = editor;
                const ols = view.dom.querySelectorAll('ol');
                ols.forEach(ol => { (ol as HTMLElement).style.listStyleType = s.value; });
              }}
            >
              {s.label}
            </DropItem>
          ))}
        </ToolbarDropdown>

        {/* ── TABLE PICKER ── */}
        <TablePicker
          disabled={disabled}
          onPick={(rows, cols) => editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()}
        />

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-0.5" />

        {/* ── COMBINED EMBED ── */}
        <button type="button" disabled={disabled} title="Embed Media (Foto / Video / YouTube)"
          onClick={() => { setEmbedUrl(''); setIsEmbedModalOpen(true); }}
          className={btnCls(false)}>
          <ExternalLink size={16} />
        </button>

        {/* DAM file upload */}
        <button type="button" disabled={disabled} onClick={handleFileClick} title="Tempo File (DAM)"
          className={btnCls(false)}>
          <Database size={16} />
        </button>
        <input disabled={disabled} ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" accept="*/*" />

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-0.5" />

        {/* ── TEMPO TEMPLATES ── */}
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            title="Tempo Templates"
            onClick={() => setIsTemplateOpen(!isTemplateOpen)}
            className="p-2 hover:bg-gray-200 transition-colors border border-gray-300 dark:border-gray-600 disabled:opacity-50 flex items-center justify-center bg-white dark:bg-transparent min-w-[34px] min-h-[34px]"
          >
            <img src="/images/t-initial.png" alt="Tempo" className="w-[14px] h-[14px] object-contain" />
          </button>

          {isTemplateOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsTemplateOpen(false)} />
              <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-600 shadow-xl rounded-md z-50 min-w-48">
                <button type="button" onClick={() => { editor.chain().focus().toggleMark('tempoDropCap').run(); setIsTemplateOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 text-sm flex items-center gap-2">
                  <Type size={14} /> Drop Cap
                </button>
                <button type="button" onClick={() => { editor.chain().focus().insertContent('<span class="tempo-red-dot">●</span>').run(); setIsTemplateOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 text-sm flex items-center gap-2">
                  <Circle size={10} className="text-red-600" fill="currentColor" /> Red Dot
                </button>
                <button type="button" onClick={() => { editor.chain().focus().insertContent('<div class="tempo-three-dots">•••</div>').run(); setIsTemplateOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 text-sm flex items-center gap-2">
                  <MoreHorizontal size={14} /> Three Dots
                </button>
                <button type="button" onClick={() => {
                  if (editor.isActive('tempoGreyBox')) editor.chain().focus().lift('tempoGreyBox').run();
                  else editor.chain().focus().wrapIn('tempoGreyBox').run();
                  setIsTemplateOpen(false);
                }} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 text-sm flex items-center gap-2">
                  <LayoutTemplate size={14} /> Grey Box
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <EditorContent editor={editor} className={disabled ? 'opacity-70 pointer-events-none' : ''} />

      {/* ── FOOTER: word/char count ── */}
      {!disabled && (
        <div className="flex justify-start gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-[11px] text-gray-500 font-medium tracking-wide">
          <span><strong className="text-gray-800 dark:text-gray-300">{editor.storage.characterCount.words()}</strong> Words</span>
          <span className="text-gray-300">|</span>
          <span><strong className="text-gray-800 dark:text-gray-300">{editor.storage.characterCount.characters()}</strong> Alphabet (Chars)</span>
        </div>
      )}

      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #adb5bd; pointer-events: none; height: 0; }
        .ProseMirror h1 { font-weight: 700; font-size: 24px; margin: 1em 0 0.5em 0; }
        .ProseMirror h2 { font-weight: 700; font-size: 20px; margin: 1em 0 0.5em 0; }
        .ProseMirror h3 { font-weight: 700; font-size: 18px; margin: 1em 0 0.5em 0; }
        .ProseMirror h4 { font-weight: 600; font-size: 12px; margin: 1em 0 0.5em 0; }
        .ProseMirror h5 { font-weight: 600; font-size: 10px; margin: 1em 0 0.5em 0; }
        .ProseMirror p  { font-weight: 400; font-size: 16px; margin-bottom: 0.5rem; }
        .ProseMirror blockquote { border-left: 3px solid #e5e7eb; padding-left: 1rem; margin-left: 0; color: #4b5563; }
        .ProseMirror ul { padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .ProseMirror ol { padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .ProseMirror table { border-collapse: collapse; table-layout: fixed; width: 100%; margin: 1rem 0; }
        .ProseMirror td, .ProseMirror th { min-width: 1em; border: 1px solid #ced4da; padding: 5px 8px; vertical-align: top; }
        .ProseMirror th { font-weight: bold; background-color: #f1f3f5; color: #000; text-align: left; }
        .ProseMirror img { max-width: 100%; border-radius: 8px; margin: 1rem auto; display: block; }
        .ProseMirror iframe { max-width: 100%; border-radius: 8px; margin: 1rem auto; display: block; aspect-ratio: 16/9; }
        .tempo-grey-box p:first-child { font-weight: bold; color: #ef4444; font-size: 1.125rem; margin-bottom: 0.5rem; }
      `}</style>
    </div>
  );
}
