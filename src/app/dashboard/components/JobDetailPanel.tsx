'use client'

import { useState, useEffect } from 'react'
import { CvViewer } from './CvViewer'
import { Job, Application, CvVersion } from '@/lib/types'
import { createClient } from '@/lib/supabase-client'
import { calculateMatchScore, getScoreColor, timeAgo } from '@/lib/skill-matcher'

type Stage = 'new' | 'tailoring' | 'review' | 'applied' | 'interview' | 'rejected'

interface Props {
  itemId: string
  stage: Stage
  items: any[]
  onStatusChange: () => void
}

const SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn', indeed: 'Indeed', glassdoor: 'Glassdoor',
  ziprecruiter: 'ZipRecruiter', jobbank: 'Job Bank', other: 'Adzuna',
}

const INDUSTRY_BADGES: Record<string, { icon: string; color: string }> = {
  hospitality:   { icon: '🏨', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  healthcare:    { icon: '🏥', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  tech:          { icon: '💻', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  finance:       { icon: '🏦', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  'real-estate': { icon: '🏢', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  retail:        { icon: '🛍️', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  gov:           { icon: '🏛️', color: 'bg-slate-500/30 text-slate-300 border-slate-500/30' },
  other:         { icon: '🔹', color: 'bg-slate-700/50 text-slate-400 border-slate-600' },
}

function getInitials(company: string): string {
  return company.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
}
const LOGO_COLORS = ['bg-blue-600','bg-purple-600','bg-green-600','bg-red-600','bg-orange-600','bg-teal-600','bg-pink-600','bg-indigo-600']
function logoColor(company: string): string {
  let h = 0; for (const c of company) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return LOGO_COLORS[h % LOGO_COLORS.length]
}

function formatDescription(text: string): string[] {
  return text.split(/\n+/).map(p => p.trim()).filter(Boolean)
}

export function JobDetailPanel({ itemId, stage, items, onStatusChange }: Props) {
  const supabase = createClient()
  const [job, setJob] = useState<Job | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [cvVersion, setCvVersion] = useState<CvVersion | null>(null)
  const [isTailoring, setIsTailoring] = useState(false)
  const [showFullDesc, setShowFullDesc] = useState(false)

  useEffect(() => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    setShowFullDesc(false)
    if (item.title) {
      setJob(item as Job)
      setApplication(null)
    } else {
      setApplication(item as Application)
      setJob(item.job || null)
    }
  }, [itemId, items])

  useEffect(() => {
    if (!job) return
    setCvVersion(null)
    supabase
      .from('cv_versions')
      .select('*')
      .eq('job_id', job.id)
      .order('version', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => setCvVersion(data))
  }, [job])

  const handleTailorCv = async (notes?: string) => {
    if (!job) return
    setIsTailoring(true)
    if (!application) {
      await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      })
    }
    const res = await fetch('/api/tailor-cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: job.id, notes: notes || '' }),
    })
    const cv = await res.json()
    if (!res.ok) { setIsTailoring(false); return }
    await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv_version_id: cv.id }),
    })
    const { data } = await supabase
      .from('cv_versions').select('*').eq('job_id', job.id)
      .order('version', { ascending: false }).limit(1).single()
    setCvVersion(data)
    setIsTailoring(false)
    onStatusChange()
  }

  const handleMarkApplied = async () => {
    if (!application) return
    await fetch(`/api/applications/${application.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'applied' }),
    })
    onStatusChange()
  }

  if (!job) return <div className="p-6 text-slate-500 text-sm">Loading...</div>

  const match = calculateMatchScore(job.title, job.description)
  const scoreColors = getScoreColor(match.score)
  const industry = INDUSTRY_BADGES[job.industry] || INDUSTRY_BADGES.other
  const paragraphs = formatDescription(job.description)
  const previewParagraphs = paragraphs.slice(0, 3)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-slate-800 bg-slate-900 shrink-0">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className={`w-14 h-14 rounded-xl ${logoColor(job.company)} flex items-center justify-center text-white text-lg font-bold shrink-0`}>
            {getInitials(job.company)}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white leading-tight">{job.title}</h1>
            <p className="text-slate-300 mt-0.5 text-sm">{job.company}</p>
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-400 flex-wrap">
              <span>📍 {job.location}</span>
              <span className="text-slate-700">·</span>
              <span>🕐 {timeAgo(job.found_at || job.posted_at)}</span>
              <span className="text-slate-700">·</span>
              <span>via {SOURCE_LABELS[job.source] || job.source}</span>
            </div>

            {/* Tags row */}
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {/* Match score */}
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${scoreColors.bg} ${scoreColors.text} ${scoreColors.border}`}>
                <span className="w-2 h-2 rounded-full bg-current" />
                {match.score}% match
              </span>

              {/* Industry */}
              <span className={`text-xs px-2.5 py-1 rounded-full border ${industry.color}`}>
                {industry.icon} {job.industry}
              </span>

              {/* ATS score if CV exists */}
              {cvVersion && (
                <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold
                  ${cvVersion.ats_score >= 80 ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'}`}>
                  ATS {cvVersion.ats_score}%
                </span>
              )}

              {/* Title match badge */}
              {match.titleMatch && (
                <span className="text-xs px-2.5 py-1 rounded-full border bg-purple-500/20 text-purple-300 border-purple-500/40">
                  ✓ Title match
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {!cvVersion && (
            <button
              onClick={() => handleTailorCv()}
              disabled={isTailoring}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isTailoring ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Tailoring...</>
              ) : (
                <>✍️ Tailor CV</>
              )}
            </button>
          )}

          {cvVersion && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Apply Now →
            </a>
          )}

          {cvVersion && stage === 'review' && (
            <button
              onClick={handleMarkApplied}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              ✓ Mark Applied
            </button>
          )}

          {!cvVersion && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-slate-600 hover:border-slate-500 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              View Original ↗
            </a>
          )}
        </div>

        {/* Matched skills chips */}
        {match.matchedSkills.length > 0 && !cvVersion && (
          <div className="mt-3">
            <p className="text-xs text-slate-500 mb-1.5">Your skills found in this job:</p>
            <div className="flex flex-wrap gap-1.5">
              {match.matchedSkills.slice(0, 12).map(skill => (
                <span key={skill} className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                  {skill}
                </span>
              ))}
              {match.matchedSkills.length > 12 && (
                <span className="text-xs px-2 py-0.5 text-slate-500">+{match.matchedSkills.length - 12} more</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {cvVersion || isTailoring ? (
          <CvViewer cvVersion={cvVersion} onRetailor={handleTailorCv} isTailoring={isTailoring} />
        ) : (
          <div className="px-6 py-5">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Job Description</h2>
            <div className="space-y-3">
              {(showFullDesc ? paragraphs : previewParagraphs).map((p, i) => (
                <p key={i} className="text-sm text-slate-300 leading-relaxed">{p}</p>
              ))}
            </div>
            {paragraphs.length > 3 && (
              <button
                onClick={() => setShowFullDesc(v => !v)}
                className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                {showFullDesc ? '↑ Show less' : `↓ Show full description (${paragraphs.length - 3} more paragraphs)`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
