'use client'

import { ApplicationStatus } from '@/lib/types'

const STAGES: { status: ApplicationStatus | 'new'; label: string; color: string; emoji: string }[] = [
  { status: 'new',       label: 'New',         color: 'text-blue-400',   emoji: '📋' },
  { status: 'tailoring', label: 'CV Tailoring', color: 'text-purple-400', emoji: '✍️' },
  { status: 'review',    label: 'Review',       color: 'text-yellow-400', emoji: '👀' },
  { status: 'applied',   label: 'Applied',      color: 'text-green-400',  emoji: '✅' },
  { status: 'interview', label: 'Interview',    color: 'text-red-400',    emoji: '📞' },
  { status: 'rejected',  label: 'Rejected',     color: 'text-slate-400',  emoji: '✗'  },
]

interface Props {
  selected: ApplicationStatus | 'new'
  counts: Record<string, number>
  onSelect: (status: ApplicationStatus | 'new') => void
}

export function PipelineSidebar({ selected, counts, onSelect }: Props) {
  return (
    <aside className="w-52 shrink-0 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-1">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Pipeline</h2>
      {STAGES.map(({ status, label, color, emoji }) => (
        <button
          key={status}
          onClick={() => onSelect(status)}
          className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors
            ${selected === status
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
        >
          <span>{emoji} <span className={`ml-1 ${color}`}>{label}</span></span>
          {counts[status] !== undefined && (
            <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">
              {counts[status]}
            </span>
          )}
        </button>
      ))}
      <div className="mt-auto pt-4 border-t border-slate-800">
        <button
          onClick={() => onSelect('new')}
          className="w-full text-xs text-slate-500 hover:text-slate-300 text-left"
        >
          View Application Log →
        </button>
      </div>
    </aside>
  )
}
