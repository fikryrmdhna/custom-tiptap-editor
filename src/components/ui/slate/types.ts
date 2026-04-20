import type { ReactEditor } from 'slate-react';

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
    Editor: ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}
