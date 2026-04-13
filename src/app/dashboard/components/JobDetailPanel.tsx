'use client'

import { useState, useEffect } from 'react'
import { CvViewer } from './CvViewer'
import { Job, Application, CvVersion } from '@/lib/types'
import { createClient } from '@/lib/supabase-client'
import { calculateMatchScore, timeAgo } from '@/lib/skill-matcher'

type Stage = 'new' | 'tailoring' | 'review' | 'applied' | 'interview' | 'rejected'

interface Props {
  itemId: string
  stage: Stage
  items: any[]
  onStatusChange: () => void
}

const SOURCE_LABEL: Record<string, string> = {
  linkedin: 'LinkedIn', indeed: 'Indeed', glassdoor: 'Glassdoor',
  ziprecruiter: 'ZipRecruiter', jobbank: 'Job Bank', other: 'Adzuna',
}
const LOGO_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700', 'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700', 'bg-cyan-100 text-cyan-700',
]
function logoClass(s: string) {
  let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return LOGO_COLORS[h % LOGO_COLORS.length]
}
function initials(s: string) {
  return s.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-blue-600' : score >= 40 ? 'text-amber-500' : 'text-gray-400'
  const bg = score >= 80 ? 'bg-emerald-50 border-emerald-200' : score >= 60 ? 'bg-blue-50 border-blue-200' : score >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
  return (
    <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 ${bg}`}>
      <span className={`text-xl font-black ${color}`}>{score}</span>
      <span className="text-gray-400 text-[10px] font-medium">% FIT</span>
    </div>
  )
}

export function JobDetailPanel({ itemId, stage, items, onStatusChange }: Props) {
  const supabase = createClient()
  const [job, setJob] = useState<Job | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [cvVersion, setCvVersion] = useState<CvVersion | null>(null)
  const [isTailoring, setIsTailoring] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    setExpanded(false)
    if (item.title) { setJob(item as Job); setApplication(null) }
    else { setApplication(item as Application); setJob(item.job || null) }
  }, [itemId, items])

  useEffect(() => {
    if (!job) return
    setCvVersion(null)
    supabase.from('cv_versions').select('*').eq('job_id', job.id)
      .order('version', { ascending: false }).limit(1).single()
      .then(({ data }) => setCvVersion(data))
  }, [job])

  const handleTailorCv = async (notes?: string) => {
    if (!job) return
    setIsTailoring(true)
    if (!application) {
      await fetch('/api/applications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      })
    }
    const res = await fetch('/api/tailor-cv', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: job.id, notes: notes || '' }),
    })
    const cv = await res.json()
    if (!res.ok) { setIsTailoring(false); return }
    await fetch('/api/generate-pdf', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv_version_id: cv.id }),
    })
    const { data } = await supabase.from('cv_versions').select('*').eq('job_id', job.id)
      .order('version', { ascending: false }).limit(1).single()
    setCvVersion(data)
    setIsTailoring(false)
    onStatusChange()
  }

  const handleMarkApplied = async () => {
    if (!application) return
    await fetch(`/api/applications/${application.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'applied' }),
    })
    onStatusChange()
  }

  if (!job) return <div className="p-8 text-gray-400 text-sm">Loading…</div>

  const match = calculateMatchScore(job.title, job.description)
  const paragraphs = job.description?.split(/\n+/).map((p: string) => p.trim()).filter(Boolean) || []
  const preview = paragraphs.slice(0, 4)

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Job header card ─────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm">

        {/* Company + score row */}
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl ${logoClass(job.company)} flex items-center justify-center text-lg font-bold shadow-sm shrink-0`}>
            {initials(job.company)}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{job.title}</h1>
            <p className="text-blue-600 font-semibold mt-0.5 text-sm">{job.company}</p>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 flex-wrap">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {job.location}
              </span>
              <span className="text-gray-300">|</span>
              <span>Posted {timeAgo(job.found_at || job.posted_at)}</span>
              <span className="text-gray-300">|</span>
              <span>via {SOURCE_LABEL[job.source] || job.source}</span>
            </div>
          </div>

          <ScoreRing score={match.score} />
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {match.titleMatch && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold border border-purple-200">
              ✓ Title match
            </span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
            {job.industry}
          </span>
          {cvVersion && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border
              ${cvVersion.ats_score >= 80
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
              ATS {cvVersion.ats_score}%
            </span>
          )}
        </div>

        {/* Matched skills */}
        {match.matchedSkills.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-2">Your skills found in this posting:</p>
            <div className="flex flex-wrap gap-1.5">
              {match.matchedSkills.slice(0, 12).map(s => (
                <span key={s} className="text-xs px-2 py-0.5 bg-white text-blue-700 rounded-lg border border-blue-200 shadow-sm font-medium">
                  {s}
                </span>
              ))}
              {match.matchedSkills.length > 12 && (
                <span className="text-xs text-blue-400 px-1">+{match.matchedSkills.length - 12} more</span>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mt-5 flex-wrap">
          {!cvVersion ? (
            <button
              onClick={() => handleTailorCv()}
              disabled={isTailoring}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-blue-200"
            >
              {isTailoring ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Tailoring CV…</>
              ) : (
                <>✍️ Tailor My CV for This Role</>
              )}
            </button>
          ) : (
            <a href={job.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-blue-200">
              Apply Now →
            </a>
          )}

          {cvVersion && stage === 'review' && (
            <button onClick={handleMarkApplied}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors">
              ✓ Mark Applied
            </button>
          )}

          <a href={job.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 border-2 border-gray-200 hover:border-gray-300 text-gray-600 text-sm font-medium rounded-xl transition-colors bg-white">
            View original ↗
          </a>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="flex-1 bg-gray-50">
        {cvVersion || isTailoring ? (
          <CvViewer cvVersion={cvVersion} onRetailor={handleTailorCv} isTailoring={isTailoring} />
        ) : (
          <div className="px-8 py-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">Full Job Description</h2>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              {(expanded ? paragraphs : preview).map((p: string, i: number) => (
                <p key={i} className="text-sm text-gray-700 leading-relaxed">{p}</p>
              ))}
              {paragraphs.length > 4 && (
                <button onClick={() => setExpanded(v => !v)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors pt-2">
                  {expanded ? '↑ Show less' : `↓ Show full description (${paragraphs.length - 4} more sections)`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
