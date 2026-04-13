'use client'

import { useState } from 'react'
import { Job, Application } from '@/lib/types'
import { getScoreColor, timeAgo } from '@/lib/skill-matcher'

type EnrichedJob = Job & { match_score?: number; title_match?: boolean }
type EnrichedApp = Application & { job?: Job; match_score?: number }
type JobOrApp = EnrichedJob | EnrichedApp

const SOURCE_LABEL: Record<string, string> = {
  linkedin: 'LinkedIn', indeed: 'Indeed', glassdoor: 'Glassdoor',
  ziprecruiter: 'ZipRecruiter', jobbank: 'Job Bank', other: 'Adzuna',
}
const INDUSTRY_ICON: Record<string, string> = {
  hospitality: '🏨', healthcare: '🏥', tech: '💻', finance: '🏦',
  'real-estate': '🏢', retail: '🛍️', gov: '🏛️', other: '💼',
}
const LOGO_COLORS = [
  ['bg-blue-100 text-blue-700'],
  ['bg-violet-100 text-violet-700'],
  ['bg-emerald-100 text-emerald-700'],
  ['bg-rose-100 text-rose-700'],
  ['bg-amber-100 text-amber-700'],
  ['bg-cyan-100 text-cyan-700'],
  ['bg-pink-100 text-pink-700'],
  ['bg-indigo-100 text-indigo-700'],
]

function logoClass(s: string) {
  let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return LOGO_COLORS[h % LOGO_COLORS.length][0]
}
function initials(s: string) {
  return s.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function getJob(item: JobOrApp): Job | undefined {
  return 'title' in item ? (item as Job) : (item as EnrichedApp).job
}
function getScore(item: JobOrApp): number | undefined {
  return (item as any).match_score
}
function isTitleMatch(item: JobOrApp): boolean {
  return !!(item as any).title_match
}

interface Props {
  items: JobOrApp[]
  selectedId: string | null
  onSelect: (id: string) => void
  status: string
}

// Score badge — light mode colors
function ScoreBadge({ score }: { score: number }) {
  if (score >= 80) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{score}% match</span>
  if (score >= 60) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{score}% match</span>
  if (score >= 40) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{score}% match</span>
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{score}% match</span>
}

export function JobList({ items, selectedId, onSelect, status }: Props) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? items.filter(item => {
        const job = getJob(item)
        if (!job) return false
        const q = search.toLowerCase()
        return job.title.toLowerCase().includes(q)
          || job.company.toLowerCase().includes(q)
          || job.location.toLowerCase().includes(q)
      })
    : items

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-6 py-16">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl">🔍</div>
        <p className="text-gray-700 font-semibold">No matching jobs yet</p>
        <p className="text-gray-400 text-xs leading-relaxed max-w-[200px]">
          {status === 'new'
            ? 'Jobs from ON, BC & NB with 50%+ skill match will appear here every 2 hours'
            : 'No jobs in this stage yet'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Search bar */}
      <div className="px-3 py-2.5 border-b border-gray-100 shrink-0 bg-gray-50">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title, company or city…"
            className="w-full bg-white text-sm text-gray-700 placeholder-gray-400 pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Count bar */}
      <div className="px-4 py-2 border-b border-gray-100 shrink-0 bg-gray-50">
        <p className="text-xs text-gray-400">
          <span className="text-gray-700 font-semibold">{filtered.length}</span>
          {status === 'new' ? ' jobs · last 24h · ON, BC & NB · 50%+ match' : ' jobs in pipeline'}
        </p>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No results for "{search}"</div>
        ) : filtered.map(item => {
          const job = getJob(item)
          if (!job) return null
          const id = item.id
          const score = getScore(item)
          const titleMatch = isTitleMatch(item)
          const selected = selectedId === id

          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`w-full text-left px-4 py-4 transition-all group relative
                ${selected
                  ? 'bg-blue-50 border-l-4 border-l-blue-600'
                  : 'bg-white hover:bg-gray-50 border-l-4 border-l-transparent'
                }`}
            >
              {/* Top row: logo + title + score */}
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl ${logoClass(job.company)} flex items-center justify-center text-xs font-bold shrink-0 shadow-sm`}>
                  {initials(job.company)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm leading-snug transition-colors
                    ${selected ? 'text-blue-700' : 'text-gray-900 group-hover:text-blue-700'}`}>
                    {job.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{job.company}</div>
                </div>
                {score !== undefined && <ScoreBadge score={score} />}
              </div>

              {/* Location */}
              <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 ml-13">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {job.location}
              </div>

              {/* Description snippet */}
              <p className="mt-2 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                {job.description?.slice(0, 130)}…
              </p>

              {/* Bottom row: industry + tags + time */}
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400">
                  {INDUSTRY_ICON[job.industry] || '💼'} {job.industry}
                </span>
                {titleMatch && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 font-medium">✓ title</span>
                )}
                <span className="ml-auto text-xs text-gray-400">
                  {timeAgo(job.found_at || job.posted_at)} · {SOURCE_LABEL[job.source] || job.source}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
