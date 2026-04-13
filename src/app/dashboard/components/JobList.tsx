'use client'

import { Job, Application } from '@/lib/types'
import { getScoreColor, timeAgo } from '@/lib/skill-matcher'

type EnrichedJob = Job & { match_score?: number; title_match?: boolean; applications?: Application[] }
type EnrichedApp = Application & { job?: Job; match_score?: number }
type JobOrApp = EnrichedJob | EnrichedApp

const INDUSTRY_BADGES: Record<string, { icon: string; label: string; color: string }> = {
  hospitality:   { icon: '🏨', label: 'Hospitality',  color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  healthcare:    { icon: '🏥', label: 'Healthcare',   color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  tech:          { icon: '💻', label: 'Tech',          color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  finance:       { icon: '🏦', label: 'Finance',      color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  'real-estate': { icon: '🏢', label: 'Real Estate',  color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  retail:        { icon: '🛍️', label: 'Retail',       color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  gov:           { icon: '🏛️', label: 'Government',   color: 'bg-slate-500/30 text-slate-300 border-slate-500/30' },
  other:         { icon: '🔹', label: 'Other',        color: 'bg-slate-700/50 text-slate-400 border-slate-600' },
}

const SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn', indeed: 'Indeed', glassdoor: 'Glassdoor',
  ziprecruiter: 'ZipRecruiter', jobbank: 'Job Bank', other: 'Adzuna',
}

function getJob(item: JobOrApp): Job | undefined {
  if ('title' in item) return item as Job
  if ('job' in item && (item as EnrichedApp).job) return (item as EnrichedApp).job
}

function getId(item: JobOrApp): string {
  return item.id
}

function getMatchScore(item: JobOrApp): number | undefined {
  return (item as any).match_score
}

function getInitials(company: string): string {
  return company.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const LOGO_COLORS = [
  'bg-blue-600', 'bg-purple-600', 'bg-green-600', 'bg-red-600',
  'bg-orange-600', 'bg-teal-600', 'bg-pink-600', 'bg-indigo-600',
]

function logoColor(company: string): string {
  let h = 0
  for (const c of company) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return LOGO_COLORS[h % LOGO_COLORS.length]
}

interface Props {
  items: JobOrApp[]
  selectedId: string | null
  onSelect: (id: string) => void
  status: string
}

export function JobList({ items, selectedId, onSelect, status }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-center px-4">
        <span className="text-2xl">🔍</span>
        <p className="text-slate-400 text-sm font-medium">No matching jobs</p>
        <p className="text-slate-600 text-xs">
          {status === 'new'
            ? 'Jobs matching your skills (50%+) from the last 24h will appear here'
            : 'No jobs in this stage yet'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0 overflow-y-auto">
      {status === 'new' && (
        <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 sticky top-0 z-10">
          <p className="text-xs text-slate-500">
            <span className="text-slate-300 font-medium">{items.length}</span> jobs matched · last 24h · 50%+ fit
          </p>
        </div>
      )}
      {items.map((item) => {
        const job = getJob(item)
        const id = getId(item)
        if (!job) return null
        const matchScore = getMatchScore(item)
        const scoreColors = matchScore !== undefined ? getScoreColor(matchScore) : null
        const industry = INDUSTRY_BADGES[job.industry] || INDUSTRY_BADGES.other
        const isSelected = selectedId === id
        const snippet = job.description?.slice(0, 120).trim() + (job.description?.length > 120 ? '…' : '')

        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`w-full text-left px-3 py-3 border-b border-slate-800/60 transition-all
              ${isSelected
                ? 'bg-blue-950/60 border-l-2 border-l-blue-500'
                : 'hover:bg-slate-800/50 border-l-2 border-l-transparent'
              }`}
          >
            {/* Row 1: Logo + Title + Score */}
            <div className="flex items-start gap-2.5">
              {/* Company logo placeholder */}
              <div className={`w-9 h-9 rounded-lg ${logoColor(job.company)} flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5`}>
                {getInitials(job.company)}
              </div>

              <div className="flex-1 min-w-0">
                {/* Title */}
                <div className={`text-sm font-semibold leading-tight line-clamp-1 ${isSelected ? 'text-blue-300' : 'text-slate-100'}`}>
                  {job.title}
                </div>

                {/* Company + Location */}
                <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                  {job.company} · {job.location}
                </div>

                {/* Row 2: Match score + Industry + Time */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {matchScore !== undefined && scoreColors && (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded border ${scoreColors.bg} ${scoreColors.text} ${scoreColors.border}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                      {matchScore}% match
                    </span>
                  )}
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${industry.color}`}>
                    {industry.icon} {industry.label}
                  </span>
                  <span className="text-xs text-slate-600 ml-auto">
                    {timeAgo(job.found_at || job.posted_at)}
                  </span>
                </div>

                {/* Row 3: Description snippet */}
                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                  {snippet}
                </p>

                {/* Row 4: Source */}
                <div className="mt-1.5">
                  <span className="text-xs text-slate-600">
                    via {SOURCE_LABELS[job.source] || job.source}
                  </span>
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
