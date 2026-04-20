import { useState } from 'react';
import { X } from 'lucide-react';

interface LinkModalProps {
  initialText?: string;
  initialUrl?: string;
  isEdit?: boolean;
  onInsert: (text: string, url: string) => void;
  onClose: () => void;
}

export const LinkModal = ({ initialText = '', initialUrl = '', isEdit = false, onInsert, onClose }: LinkModalProps) => {
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
