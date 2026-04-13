'use client'

import { useState, useEffect } from 'react'
import { CvViewer } from './CvViewer'
import { Job, Application, CvVersion } from '@/lib/types'
import { createClient } from '@/lib/supabase-client'

type Stage = 'new' | 'tailoring' | 'review' | 'applied' | 'interview' | 'rejected'

interface Props {
  itemId: string
  stage: Stage
  items: any[]
  onStatusChange: () => void
}

const INDUSTRY_LABEL: Record<string, string> = {
  hospitality: '🏨 Hospitality',
  healthcare: '🏥 Healthcare',
  tech: '💻 Tech',
  finance: '🏦 Finance',
  'real-estate': '🏢 Real Estate',
  retail: '🛍️ Retail',
  gov: '🏛️ Government',
  other: '🔹 Other',
}

export function JobDetailPanel({ itemId, stage, items, onStatusChange }: Props) {
  const supabase = createClient()
  const [job, setJob] = useState<Job | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [cvVersion, setCvVersion] = useState<CvVersion | null>(null)
  const [isTailoring, setIsTailoring] = useState(false)

  useEffect(() => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
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
    supabase
      .from('cv_versions')
      .select('*')
      .eq('job_id', job.id)
      .order('version', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => setCvVersion(data))
  }, [job])

  const handleTailorCv = async () => {
    if (!job) return
    setIsTailoring(true)

    // Create application if it doesn't exist
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
      body: JSON.stringify({ job_id: job.id }),
    })
    const cv = await res.json()
    if (!res.ok) { setIsTailoring(false); return }

    // Generate PDF
    await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv_version_id: cv.id }),
    })

    // Refresh cv version
    const { data } = await supabase
      .from('cv_versions')
      .select('*')
      .eq('job_id', job.id)
      .order('version', { ascending: false })
      .limit(1)
      .single()
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-white">{job.title}</h1>
            <div className="text-sm text-slate-400 mt-0.5">{job.company} · {job.location}</div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                {job.source}
              </span>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                {INDUSTRY_LABEL[job.industry] || job.industry}
              </span>
              {cvVersion && (
                <span className={`text-xs px-2 py-0.5 rounded font-medium
                  ${cvVersion.ats_score >= 80 ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                  ATS {cvVersion.ats_score}%
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {!cvVersion && (
              <button
                onClick={handleTailorCv}
                disabled={isTailoring}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-md"
              >
                {isTailoring ? 'Tailoring...' : '✍️ Tailor CV'}
              </button>
            )}
            {cvVersion && stage === 'review' && (
              <>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md"
                >
                  Apply Now →
                </a>
                <button
                  onClick={handleMarkApplied}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-md"
                >
                  Mark Applied ✓
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CV Viewer tabs */}
      <div className="flex-1 overflow-hidden">
        {cvVersion || isTailoring ? (
          <CvViewer
            cvVersion={cvVersion}
            onRetailor={handleTailorCv}
            isTailoring={isTailoring}
          />
        ) : (
          <div className="p-6">
            <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-3">Job Description</div>
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {job.description}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
