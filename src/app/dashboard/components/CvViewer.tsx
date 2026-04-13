'use client'

import { useState } from 'react'
import { CvVersion } from '@/lib/types'

interface Props {
  cvVersion: CvVersion | null
  onRetailor: (notes: string) => void
  isTailoring: boolean
}

type Tab = 'cv' | 'jd' | 'split' | 'improve'

export function CvViewer({ cvVersion, onRetailor, isTailoring }: Props) {
  const [tab, setTab] = useState<Tab>('cv')
  const [notes, setNotes] = useState('')

  if (!cvVersion) {
    return (
      <div className="p-6 text-slate-500 text-sm">No CV tailored yet for this job.</div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'cv',      label: `CV Sent (v${cvVersion.version})` },
    { id: 'jd',      label: 'Job Description' },
    { id: 'split',   label: 'Side by Side' },
    { id: 'improve', label: 'Improve CV →' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm transition-colors
              ${tab === t.id
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-slate-400 hover:text-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
        {cvVersion.pdf_url && (
          <a
            href={cvVersion.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto px-4 py-2.5 text-sm text-blue-400 hover:text-blue-300"
          >
            📥 Download PDF
          </a>
        )}
      </div>

      {/* ATS badge */}
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 border-b border-slate-800">
        <span className="text-xs text-slate-400">ATS Score:</span>
        <span className={`text-sm font-bold ${cvVersion.ats_score >= 80 ? 'text-green-400' : cvVersion.ats_score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
          {cvVersion.ats_score}%
        </span>
        <span className="text-xs text-slate-500">
          Keywords: {cvVersion.keywords_matched.slice(0, 6).join(', ')}
          {cvVersion.keywords_matched.length > 6 && ` +${cvVersion.keywords_matched.length - 6} more`}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'cv' && (
          <div className="prose prose-invert prose-sm max-w-none font-serif leading-relaxed whitespace-pre-wrap text-slate-200">
            {cvVersion.cv_content}
          </div>
        )}

        {tab === 'jd' && (
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            <div className="text-xs text-yellow-400 font-semibold uppercase tracking-wide mb-3">
              Job Description — Saved at time of tailoring
            </div>
            {cvVersion.jd_snapshot}
          </div>
        )}

        {tab === 'split' && (
          <div className="grid grid-cols-2 gap-4 h-full">
            <div>
              <div className="text-xs text-green-400 font-semibold uppercase tracking-wide mb-2">CV Sent</div>
              <div className="text-xs text-slate-300 font-serif leading-relaxed whitespace-pre-wrap">
                {cvVersion.cv_content}
              </div>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <div className="text-xs text-yellow-400 font-semibold uppercase tracking-wide mb-2">Job Description</div>
              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {cvVersion.jd_snapshot}
              </div>
            </div>
          </div>
        )}

        {tab === 'improve' && (
          <div className="max-w-lg">
            <div className="text-sm text-slate-300 mb-4">
              Generate an improved v{cvVersion.version + 1} of your CV for this role. Optionally add notes to guide the rewrite.
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional: e.g. 'emphasize Azure experience more', 'add CCNP to certifications section'..."
              className="w-full h-28 bg-slate-800 border border-slate-700 rounded-md p-3 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={() => onRetailor(notes)}
              disabled={isTailoring}
              className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-md transition-colors"
            >
              {isTailoring ? 'Tailoring...' : `Generate v${cvVersion.version + 1} →`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
