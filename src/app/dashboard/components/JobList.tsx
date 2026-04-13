'use client'

import { Job, Application } from '@/lib/types'

type JobOrApp = (Job & { applications?: Application[] }) | (Application & { job?: Job })

interface Props {
  items: JobOrApp[]
  selectedId: string | null
  onSelect: (id: string) => void
  status: string
}

const INDUSTRY_BADGES: Record<string, string> = {
  hospitality: '🏨',
  healthcare:  '🏥',
  tech:        '💻',
  finance:     '🏦',
  'real-estate': '🏢',
  retail:      '🛍️',
  gov:         '🏛️',
  other:       '🔹',
}

function getJob(item: JobOrApp): Job | undefined {
  if ('title' in item) return item as Job
  if ('job' in item && item.job) return item.job
}

function getId(item: JobOrApp): string {
  if ('title' in item) return (item as Job).id
  return (item as Application).id
}

export function JobList({ items, selectedId, onSelect, status }: Props) {
  if (items.length === 0) {
    return (
      <div className="p-6 text-slate-500 text-sm">No jobs in this stage.</div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-slate-800 overflow-y-auto">
      {items.map((item) => {
        const job = getJob(item)
        const id = getId(item)
        if (!job) return null
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`text-left px-4 py-3 hover:bg-slate-800 transition-colors
              ${selectedId === id ? 'bg-slate-800 border-l-2 border-blue-500' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-medium text-slate-100 line-clamp-1">
                  {INDUSTRY_BADGES[job.industry] || '🔹'} {job.title}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{job.company}</div>
                <div className="text-xs text-slate-500 mt-0.5">{job.location} · {job.source}</div>
              </div>
              {job.industry === 'hospitality' && (
                <span className="text-xs bg-yellow-900 text-yellow-300 px-1.5 py-0.5 rounded shrink-0">
                  Hospitality
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
