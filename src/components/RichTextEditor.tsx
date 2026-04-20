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
  List, ListOrdered, Quote, Paperclip, Video as VideoIcon, 
  Database, Type, Circle, MoreHorizontal, LayoutTemplate, Table as TableIcon
} from 'lucide-react';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFileAttach?: () => void;
  disabled?: boolean;
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Tulis di sini...", 
  onFileAttach, 
  disabled = false 
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5],
        },
      }),
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
      // Tempo Extensions
      Video,
      ThreeBlackDots,
      TempoGreyBox,
      TempoDropCap,
      TempoRedDot
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none w-full min-h-[300px] outline-none relative px-4 py-4',
      },
      // Override default paste behavior partially if needed.
      // But Tiptap already strips off unstructured inline styles (Requirement 10) natively!
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  const handleFileClick = () => {
    if (onFileAttach) {
      onFileAttach(); // External injection for DAM
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editor) {
      const fileName = file.name;
      editor.commands.insertContent(`<a href="#" class="text-blue-600 underline">${fileName}</a>`);
    }
  };

  const handleEmbedClick = () => {
    setEmbedUrl('');
    setIsEmbedModalOpen(true);
  };

  const submitEmbed = () => {
    if (!embedUrl || !editor) return;
    const url = embedUrl.trim();

    // Check common image patterns or data URLs
    if (url.match(/\.(jpeg|jpg|gif|png|webp|svg|heic|bmp)(\?.*)?$/i) || url.startsWith('data:image/')) {
      editor.chain().focus().setImage({ src: url }).run();
    } 
    // Check YouTube links
    else if (url.match(/youtube\.com|youtu\.be/i)) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    } 
    // Check Video files
    else if (url.match(/\.(mp4|mov|webm)$/i)) {
      editor.chain().focus().insertContent(`<video src="${url}" controls width="100%"></video>`).run();
    } 
    // Fallback if the user insists on a link that might be an image but doesn't have an extension
    else {
      editor.chain().focus().setLink({ href: url }).run();
    }
    
    setIsEmbedModalOpen(false);
    setEmbedUrl('');
  };

  if (!editor) {
    return null;
  }

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded focus-within:ring-2 focus-within:ring-red-500 focus-within:border-transparent ${disabled ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}`}>
      
      {/* Embed Modal */}
      {isEmbedModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Embed Media</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL (Foto / Youtube / Video)
                </label>
                <input
                  type="url"
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://..."
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitEmbed();
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEmbedModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={submitEmbed}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Embed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar Row */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 transition-colors flex-wrap rounded-t">
        <select
          disabled={disabled}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'p') editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: parseInt(val.replace('h', '')) as any }).run();
          }}
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none"
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

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button type="button" disabled={disabled} title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition-colors border border-gray-300 dark:border-gray-600 disabled:opacity-50 ${editor.isActive('bold') ? 'bg-gray-200 text-gray-900' : ''}`}
        ><Bold size={16} /></button>

        <button type="button" disabled={disabled} title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition-colors border border-gray-300 dark:border-gray-600 disabled:opacity-50 ${editor.isActive('italic') ? 'bg-gray-200 text-gray-900' : ''}`}
        ><Italic size={16} /></button>

        <button type="button" disabled={disabled} title="Underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition-colors border border-gray-300 dark:border-gray-600 disabled:opacity-50 ${editor.isActive('underline') ? 'bg-gray-200 text-gray-900' : ''}`}
        ><UnderlineIcon size={16} /></button>

        <button type="button" disabled={disabled} title="Strikethrough"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition-colors border border-gray-300 dark:border-gray-600 disabled:opacity-50 ${editor.isActive('strike') ? 'bg-gray-200 text-gray-900' : ''}`}
        ><Strikethrough size={16} /></button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button type="button" disabled={disabled} title="Superscript"
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={`p-2 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition-colors border border-gray-300 dark:border-gray-600 disabled:opacity-50 ${editor.isActive('superscript') ? 'bg-gray-200 text-gray-900' : ''}`}
        ><SuperscriptIcon size={16} /></button>

        <button type="button" disabled={disabled} title="Subscript"
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={`p-2 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition-colors border border-gray-300 dark:border-gray-600 disabled:opacity-50 ${editor.isActive('subscript') ? 'bg-gray-200 text-gray-900' : ''}`}
        ><SubscriptIcon size={16} /></button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button type="button" disabled={disabled} title="Bullet List"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition-colors border border-gray-300 dark:border-gray-600 disabled:opacity-50 ${editor.isActive('bulletList') ? 'bg-gray-200 text-gray-900' : ''}`}
        ><List size={16} /></button>

        <button type="button" disabled={disabled} title="Numbered List"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition-colors border border-gray-300 dark:border-gray-600 disabled:opacity-50 ${editor.isActive('orderedList') ? 'bg-gray-200 text-gray-900' : ''}`}
        ><ListOrdered size={16} /></button>

        <button type="button" disabled={disabled} title="Insert Table"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className="p-2 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition-colors border border-gray-300 dark:border-gray-600 disabled:opacity-50"
        ><TableIcon size={16} /></button>

        <button type="button" disabled={disabled} title="Blockquote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition-colors border border-gray-300 dark:border-gray-600 disabled:opacity-50 ${editor.isActive('blockquote') ? 'bg-gray-200 text-gray-900' : ''}`}
        ><Quote size={16} /></button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button type="button" disabled={disabled} onClick={handleEmbedClick} title="Embed Media (Foto/Video)"
          className="p-2 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition-colors border border-gray-300 dark:border-gray-600 disabled:opacity-50">
          <VideoIcon size={16} />
        </button>

        <button type="button" disabled={disabled} onClick={handleFileClick} title="Tempo File (DAM)"
          className="p-2 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition-colors border border-gray-300 dark:border-gray-600 disabled:opacity-50">
          <Database size={16} />
        </button>
        <input disabled={disabled} ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" accept="*/*" />

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

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
              <div className="fixed inset-0 z-40" onClick={() => setIsTemplateOpen(false)}></div>
              <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-600 shadow-xl rounded-md z-50 min-w-48">
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().toggleMark('tempoDropCap').run(); setIsTemplateOpen(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400  text-sm flex items-center gap-2"
                >
                  <Type size={14} /> Drop Cap
                </button>
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().insertContent('<span class="tempo-red-dot">●</span>').run(); setIsTemplateOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400  text-sm flex items-center gap-2"
                >
                  <Circle size={10} className="text-red-600" fill='currentColor' /> Red Dot
                </button>
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().insertContent('<div class="tempo-three-dots">•••</div>').run(); setIsTemplateOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400  text-sm flex items-center gap-2"
                >
                  <MoreHorizontal size={14} /> Three Dots
                </button>
                <button
                  type="button" onClick={() => { 
                    if (editor.isActive('tempoGreyBox')) {
                      editor.chain().focus().lift('tempoGreyBox').run();
                    } else {
                      editor.chain().focus().wrapIn('tempoGreyBox').run(); 
                    }
                    setIsTemplateOpen(false); 
                  }} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400  text-sm flex items-center gap-2"
                >
                  <LayoutTemplate size={14} /> Grey Box
                </button>
              </div>
            </>
          )}
        </div>

      </div>

      <EditorContent editor={editor} className={disabled ? 'opacity-70 pointer-events-none' : ''} />

      {/* Editor Tiptap Footer: Metrik & Counter */}
      {!disabled && (
        <div className="flex justify-start gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-[11px] text-gray-500 font-medium tracking-wide">
          <span title="Dihitung per kata yang dipisah spasi">
            <strong className="text-gray-800 dark:text-gray-300">{editor.storage.characterCount.words()}</strong> Words
          </span>
          <span className="text-gray-300">|</span>
          <span title="Dihitung per huruf termasuk spasi (HTML tag dihiraukan)">
            <strong className="text-gray-800 dark:text-gray-300">{editor.storage.characterCount.characters()}</strong> Alphabet (Chars)
          </span>
        </div>
      )}

      {/* Styles applied specifically to mirror exactly Tempo's requested Typography & Components */}
      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }

        .ProseMirror h1 { font-weight: 700; font-size: 24px; line-height: 1.5rem; margin: 1em 0 0.5em 0; }
        .ProseMirror h2 { font-weight: 700; font-size: 20px; line-height: 1.25rem; margin: 1em 0 0.5em 0; }
        .ProseMirror h3 { font-weight: 700; font-size: 18px; line-height: 1.125rem; margin: 1em 0 0.5em 0; }
        .ProseMirror h4 { font-weight: 600; font-size: 12px; line-height: 0.75rem; margin: 1em 0 0.5em 0; }
        .ProseMirror h5 { font-weight: 600; font-size: 10px; line-height: 0.625rem; margin: 1em 0 0.5em 0; }
        .ProseMirror p  { font-weight: 400; font-size: 16px; line-height: 1rem; margin-bottom: 0.5rem; }
        
        .ProseMirror blockquote {
          border-left: 3px solid #e5e7eb;
          padding-left: 1rem;
          margin-left: 0;
          color: #4b5563;
        }
        
        .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.5rem; }
        
        .ProseMirror table { border-collapse: collapse; table-layout: fixed; width: 100%; margin: 1rem 0; }
        .ProseMirror td, .ProseMirror th { min-width: 1em; border: 1px solid #ced4da; padding: 5px 8px; vertical-align: top; }
        .ProseMirror th { font-weight: bold; background-color: #f1f3f5; color: #000; text-align: left; }

        .ProseMirror img { max-width: 100%; border-radius: 8px; margin: 1rem auto; display: block; }
        .ProseMirror iframe { max-width: 100%; border-radius: 8px; margin: 1rem auto; display: block; aspect-ratio: 16/9; }

        /* Render extensions nicely in editor */
        .tempo-grey-box P:first-child { font-weight: bold; color: #ef4444; font-size: 1.125rem; margin-bottom: 0.5rem; }
      `}</style>
    </div>
  );
}
