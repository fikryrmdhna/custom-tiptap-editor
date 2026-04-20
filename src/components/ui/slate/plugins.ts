import { Editor, Transforms } from 'slate';

// ─── VOID / INLINE NODE PLUGIN ────────────────────────────────────────────────
export const withCustomNodes = (editor: Editor) => {
  const { isVoid, isInline } = editor;
  editor.isVoid = (element: any) => ['media', 'three-dots'].includes(element.type) ? true : isVoid(element);
  editor.isInline = (element: any) => element.type === 'link' ? true : isInline(element);
  return editor;
};

// ─── PLAIN-TEXT PASTE PLUGIN ──────────────────────────────────────────────────
export const withPlainTextPaste = (editor: Editor) => {
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
