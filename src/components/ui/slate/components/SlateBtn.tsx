import type { LucideIcon } from 'lucide-react';

interface BtnProps {
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

export const SlateBtn = ({ icon: Icon, isActive, onClick, disabled, title }: BtnProps) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    className={`p-2 transition-colors border border-gray-300 dark:border-gray-600 disabled:opacity-50
      ${isActive
        ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white'
        : 'bg-white dark:bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300'
      }`}
  >
    <Icon size={16} />
  </button>
);

export const SlateSep = () => <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-0.5" />;
