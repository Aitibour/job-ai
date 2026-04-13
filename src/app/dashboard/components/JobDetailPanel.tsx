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

const SOURCE_LABEL: Record<string, string> = {
  linkedin: 'LinkedIn', indeed: 'Indeed', glassdoor: 'Glassdoor',
  ziprecruiter: 'ZipRecruiter', jobbank: 'Job Bank', other: 'Adzuna',
}
const LOGO_COLORS = ['bg-blue-700','bg-violet-700','bg-emerald-700','bg-rose-700','bg-amber-700','bg-cyan-700','bg-pink-700','bg-indigo-700']
function logoColor(s: string) { let h=0; for(const c of s) h=(h*31+c.charCodeAt(0))&0xffff; return LOGO_COLORS[h%LOGO_COLORS.length] }
function initials(s: string) { return s.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase() }

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

  if (!job) return <div className="p-8 text-slate-500 text-sm">Loading…</div>

  const match = calculateMatchScore(job.title, job.description)
  const sc = getScoreColor(match.score)
  const paragraphs = job.description?.split(/\n+/).map(p => p.trim()).filter(Boolean) || []
  const preview = paragraphs.slice(0, 4)

  return (
    <div className="flex flex-col h-full">

      {/* ── Job header ──────────────────────────────────────────── */}
      <div className="px-7 pt-6 pb-5 border-b border-slate-800 bg-[#161b27] shrink-0">

        {/* Company + title */}
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-xl ${logoColor(job.company)} flex items-center justify-center text-white text-lg font-bold shrink-0`}>
            {initials(job.company)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white leading-tight">{job.title}</h1>
            <div className="text-slate-300 font-medium mt-0.5">{job.company}</div>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-400 flex-wrap">
              <span>📍 {job.location}</span>
              <span className="text-slate-700">·</span>
              <span>🕐 {timeAgo(job.found_at || job.posted_at)}</span>
              <span className="text-slate-700">·</span>
              <span>{SOURCE_LABEL[job.source] || job.source}</span>
            </div>
          </div>
        </div>

        {/* Score + tags row */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full ${sc.bg} ${sc.text} border ${sc.border}`}>
            <span className="w-2 h-2 rounded-full bg-current" />
            {match.score}% match
          </span>
          {match.titleMatch && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
              ✓ Title match
            </span>
          )}
          {cvVersion && (
            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold
              ${cvVersion.ats_score >= 80 ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'}`}>
              ATS {cvVersion.ats_score}%
            </span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {job.industry}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2.5 mt-4 flex-wrap">
          {!cvVersion ? (
            <button
              onClick={() => handleTailorCv()}
              disabled={isTailoring}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-blue-900/30"
            >
              {isTailoring
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Tailoring CV…</>
                : <>✍️ Tailor CV for this role</>}
            </button>
          ) : (
            <a href={job.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-blue-900/30">
              Apply Now →
            </a>
          )}

          {cvVersion && stage === 'review' && (
            <button onClick={handleMarkApplied}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors">
              ✓ Mark Applied
            </button>
          )}

          <a href={job.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-700 hover:border-slate-500 text-slate-300 text-sm font-medium rounded-lg transition-colors">
            View posting ↗
          </a>
        </div>

        {/* Matched skills */}
        {match.matchedSkills.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-slate-500 mb-2">Your skills in this job:</p>
            <div className="flex flex-wrap gap-1.5">
              {match.matchedSkills.slice(0, 10).map(s => (
                <span key={s} className="text-xs px-2 py-0.5 bg-blue-950/60 text-blue-300 rounded border border-blue-800/50">{s}</span>
              ))}
              {match.matchedSkills.length > 10 && (
                <span className="text-xs px-2 py-0.5 text-slate-500">+{match.matchedSkills.length - 10} more</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {cvVersion || isTailoring ? (
          <CvViewer cvVersion={cvVersion} onRetailor={handleTailorCv} isTailoring={isTailoring} />
        ) : (
          <div className="px-7 py-6">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-5">Job Description</h2>
            <div className="space-y-4">
              {(expanded ? paragraphs : preview).map((p, i) => (
                <p key={i} className="text-sm text-slate-300 leading-relaxed">{p}</p>
              ))}
            </div>
            {paragraphs.length > 4 && (
              <button onClick={() => setExpanded(v => !v)}
                className="mt-5 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
                {expanded ? '↑ Show less' : `↓ Show full description (${paragraphs.length - 4} more)`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
