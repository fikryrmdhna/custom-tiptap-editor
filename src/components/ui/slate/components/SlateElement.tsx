import React from 'react';
import { useSelected, useFocused } from 'slate-react';
import { LinkContext } from '../context';

export const SlateElement = ({ attributes, children, element }: any) => {
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
