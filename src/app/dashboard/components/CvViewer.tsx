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

  if (isTailoring && !cvVersion) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <span className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-gray-500 text-sm font-medium">GPT-4o-mini is tailoring your CV…</p>
        <p className="text-gray-400 text-xs">~10 seconds</p>
      </div>
    )
  }

  if (!cvVersion) return null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'cv',      label: `CV Sent (v${cvVersion.version})` },
    { id: 'jd',      label: 'Job Description' },
    { id: 'split',   label: 'Side by Side' },
    { id: 'improve', label: 'Improve →' },
  ]

  const atsColor = cvVersion.ats_score >= 80
    ? 'text-emerald-600 bg-emerald-50'
    : cvVersion.ats_score >= 60
    ? 'text-blue-600 bg-blue-50'
    : 'text-amber-600 bg-amber-50'

  return (
    <div className="flex flex-col h-full bg-gray-50">

      {/* ATS bar */}
      <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-gray-200">
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${atsColor}`}>
          ATS {cvVersion.ats_score}%
        </div>
        <div className="text-xs text-gray-400 flex-1 truncate">
          Keywords: <span className="text-gray-600">{cvVersion.keywords_matched.slice(0, 8).join(', ')}</span>
          {cvVersion.keywords_matched.length > 8 && ` +${cvVersion.keywords_matched.length - 8} more`}
        </div>
        {cvVersion.pdf_url && (
          <a href={cvVersion.pdf_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium border border-blue-200 px-3 py-1 rounded-lg bg-blue-50 transition-colors">
            📥 PDF
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {tab === 'cv' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm max-w-3xl mx-auto">
            <div className="prose prose-sm prose-gray max-w-none font-serif leading-relaxed whitespace-pre-wrap text-gray-800">
              {cvVersion.cv_content}
            </div>
          </div>
        )}

        {tab === 'jd' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Job Description — snapshot at time of tailoring
              </span>
            </div>
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {cvVersion.jd_snapshot}
            </div>
          </div>
        )}

        {tab === 'split' && (
          <div className="grid grid-cols-2 gap-4 max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">CV Sent</span>
              </div>
              <div className="text-xs text-gray-700 font-serif leading-relaxed whitespace-pre-wrap">
                {cvVersion.cv_content}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Job Description</span>
              </div>
              <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                {cvVersion.jd_snapshot}
              </div>
            </div>
          </div>
        )}

        {tab === 'improve' && (
          <div className="max-w-lg mx-auto bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-1">Generate v{cvVersion.version + 1}</h3>
            <p className="text-sm text-gray-500 mb-4">
              Optionally add notes to guide the rewrite, then generate an improved version.
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. 'emphasize Azure more', 'lead with Opera Cloud experience', 'highlight PMO governance'…"
              className="w-full h-28 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => onRetailor(notes)}
              disabled={isTailoring}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-blue-200"
            >
              {isTailoring
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Tailoring…</>
                : `✍️ Generate v${cvVersion.version + 1}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
