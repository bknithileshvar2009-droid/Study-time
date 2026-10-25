import React from 'react';
import { Tag as TagIcon, X } from 'lucide-react';

interface TagBadgeProps {
  tag: string;
  onRemove?: () => void;
  onClick?: () => void;
  isActive?: boolean;
  size?: 'xs' | 'sm' | 'md';
}

const getTagColorClasses = (tag: string, isActive?: boolean) => {
  const normalized = tag.toLowerCase().replace(/^#/, '');

  if (isActive !== undefined) {
    if (isActive) {
      return 'bg-gradient-to-r from-amber-500/25 to-rose-500/25 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-950/20';
    }
    return 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800';
  }

  if (normalized.includes('urgent') || normalized.includes('crit')) {
    return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  }
  if (normalized.includes('exam') || normalized.includes('test')) {
    return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  }
  if (normalized.includes('review') || normalized.includes('revis')) {
    return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
  }
  if (normalized.includes('deep') || normalized.includes('focus')) {
    return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
  }
  if (normalized.includes('assign') || normalized.includes('home')) {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  }

  return 'bg-slate-800/80 text-slate-300 border-slate-700/60';
};

export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  onRemove,
  onClick,
  isActive,
  size = 'xs',
}) => {
  const cleanTag = tag.replace(/^#/, '');
  const colorClasses = getTagColorClasses(cleanTag, isActive);

  const sizeClasses = {
    xs: 'text-[10px] px-2 py-0.5 gap-1',
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center font-mono font-medium rounded-lg border transition-all ${colorClasses} ${sizeClasses} ${
        onClick ? 'cursor-pointer select-none hover:scale-102 active:scale-98' : ''
      }`}
    >
      <span className="opacity-70 font-sans">#</span>
      <span>{cleanTag}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:text-red-400 transition-colors p-0.5 -mr-0.5 rounded"
          title={`Remove #${cleanTag}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};
