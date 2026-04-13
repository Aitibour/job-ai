'use client'

import { useState } from 'react'
import { Job, Application } from '@/lib/types'
import { getScoreColor, timeAgo } from '@/lib/skill-matcher'

type EnrichedJob = Job & { match_score?: number; title_match?: boolean }
type EnrichedApp = Application & { job?: Job; match_score?: number }
type JobOrApp = EnrichedJob | EnrichedApp

const SOURCE_ICON: Record<string, string> = {
  linkedin: 'in', indeed: 'in', glassdoor: 'G',
  ziprecruiter: 'Z', jobbank: 'JB', other: 'Az',
}
const SOURCE_LABEL: Record<string, string> = {
  linkedin: 'LinkedIn', indeed: 'Indeed', glassdoor: 'Glassdoor',
  ziprecruiter: 'ZipRecruiter', jobbank: 'Job Bank', other: 'Adzuna',
}
const INDUSTRY_ICON: Record<string, string> = {
  hospitality: '🏨', healthcare: '🏥', tech: '💻',
  finance: '🏦', 'real-estate': '🏢', retail: '🛍️', gov: '🏛️', other: '🔹',
}
const LOGO_COLORS = [
  'bg-blue-700','bg-violet-700','bg-emerald-700','bg-rose-700',
  'bg-amber-700','bg-cyan-700','bg-pink-700','bg-indigo-700',
]

function logoColor(s: string) {
  let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return LOGO_COLORS[h % LOGO_COLORS.length]
}
function initials(s: string) {
  return s.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase()
}
function getJob(item: JobOrApp): Job | undefined {
  return 'title' in item ? (item as Job) : (item as EnrichedApp).job
}
function getScore(item: JobOrApp): number | undefined {
  return (item as any).match_score
}

interface Props {
  items: JobOrApp[]
  selectedId: string | null
  onSelect: (id: string) => void
  status: string
}

export function JobList({ items, selectedId, onSelect, status }: Props) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? items.filter(item => {
        const job = getJob(item)
        if (!job) return false
        const q = search.toLowerCase()
        return job.title.toLowerCase().includes(q) ||
               job.company.toLowerCase().includes(q) ||
               job.location.toLowerCase().includes(q)
      })
    : items

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-6 py-12">
        <div className="text-3xl">🔍</div>
        <p className="text-slate-300 font-medium text-sm">No matching jobs</p>
        <p className="text-slate-600 text-xs leading-relaxed">
          {status === 'new'
            ? 'Jobs with 50%+ skill match from the last 24h will appear here.\nCheck back after the next scrape.'
            : 'No jobs in this stage yet.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search bar */}
      <div className="px-3 py-2.5 border-b border-slate-800 shrink-0">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by title, company or city..."
            className="w-full bg-slate-800 text-sm text-slate-200 placeholder-slate-500 pl-8 pr-3 py-1.5 rounded-md border border-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Count bar */}
      <div className="px-3 py-1.5 border-b border-slate-800/60 shrink-0">
        <p className="text-xs text-slate-500">
          <span className="text-slate-300 font-medium">{filtered.length}</span>
          {status === 'new' ? ' jobs · last 24h · 50%+ match' : ' jobs in pipeline'}
          {search && ` · filtered`}
        </p>
      </div>

      {/* Job cards */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">No results for "{search}"</div>
        ) : (
          filtered.map(item => {
            const job = getJob(item)
            if (!job) return null
            const id = item.id
            const score = getScore(item)
            const sc = score !== undefined ? getScoreColor(score) : null
            const selected = selectedId === id

            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                className={`w-full text-left px-4 py-4 border-b border-slate-800/50 transition-all group
                  ${selected
                    ? 'bg-blue-950/40 border-l-2 border-l-blue-500 pl-3.5'
                    : 'hover:bg-slate-800/30 border-l-2 border-l-transparent'}`}
              >
                {/* Row 1: Logo + title + score */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg ${logoColor(job.company)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {initials(job.company)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm leading-snug line-clamp-2 transition-colors
                      ${selected ? 'text-blue-300' : 'text-white group-hover:text-blue-300'}`}>
                      {job.title}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">
                      {job.company}
                    </div>
                  </div>
                  {score !== undefined && sc && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md shrink-0 ${sc.bg} ${sc.text}`}>
                      {score}%
                    </span>
                  )}
                </div>

                {/* Row 2: Location + tags */}
                <div className="mt-2 flex items-center gap-2 flex-wrap pl-13">
                  <span className="text-xs text-slate-400">📍 {job.location}</span>
                </div>

                {/* Row 3: Description snippet */}
                <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed pl-0">
                  {job.description?.slice(0, 110)}…
                </p>

                {/* Row 4: Industry + source + time */}
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">
                      {INDUSTRY_ICON[job.industry]} {job.industry}
                    </span>
                    <span className="text-slate-700">·</span>
                    <span className="text-xs text-slate-600">
                      {SOURCE_LABEL[job.source] || job.source}
                    </span>
                  </div>
                  <span className="text-xs text-slate-600">
                    {timeAgo(job.found_at || job.posted_at)}
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
