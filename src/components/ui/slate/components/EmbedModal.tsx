import { useState } from 'react';
import { X } from 'lucide-react';
import { detectMediaType, buildEmbedUrl } from '../utils';
import type { MediaType } from '../types';

interface EmbedModalProps {
  title: string;
  hint: string;
  onInsert: (embedUrl: string, mediaType: MediaType, isShorts: boolean) => void;
  onClose: () => void;
}

export const EmbedModal = ({ title, hint, onInsert, onClose }: EmbedModalProps) => {
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
