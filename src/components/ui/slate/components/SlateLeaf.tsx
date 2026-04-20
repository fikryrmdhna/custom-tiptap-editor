export const SlateLeaf = ({ attributes, children, leaf }: any) => {
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
