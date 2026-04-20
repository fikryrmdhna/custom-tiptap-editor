import { useState } from 'react'
import { SlateTextEditor } from './components/ui/SlateTextEditor'

function App() {
  const [content, setContent] = useState('<p>Coba editor baru dengan <strong>Tiptap</strong>!</p>')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Editor</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Standalone Slate Environment</p>
        </div>

        <SlateTextEditor
          value={content}
          onChange={setContent}
        />

        <div className="pt-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Output HTML:</h2>
          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm text-gray-800 dark:text-gray-300 font-mono">
            {content || <span className="italic text-gray-500">Belum ada konten...</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
