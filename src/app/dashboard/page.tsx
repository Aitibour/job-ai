'use client'

import { useState, useEffect, useCallback } from 'react'
import { JobList } from './components/JobList'
import { JobDetailPanel } from './components/JobDetailPanel'
import { ApplicationStatus } from '@/lib/types'

type Stage = ApplicationStatus | 'new'

const TABS: { status: Stage; label: string; color: string }[] = [
  { status: 'new',       label: 'New Jobs',    color: 'text-blue-400' },
  { status: 'tailoring', label: 'Tailoring',   color: 'text-purple-400' },
  { status: 'review',    label: 'Review',      color: 'text-yellow-400' },
  { status: 'applied',   label: 'Applied',     color: 'text-green-400' },
  { status: 'interview', label: 'Interview',   color: 'text-red-400' },
  { status: 'rejected',  label: 'Rejected',    color: 'text-slate-500' },
]

export default function DashboardPage() {
  const [stage, setStage] = useState<Stage>('new')
  const [items, setItems] = useState<any[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastScraped, setLastScraped] = useState<string | null>(null)

  const fetchItems = useCallback(async (s: Stage) => {
    setLoading(true)
    setSelectedId(null)
    const res = await fetch(`/api/jobs?status=${s}`)
    const data = await res.json()
    const list = Array.isArray(data) ? data : []
    setItems(list)
    setLoading(false)
    if (list.length > 0 && s === 'new') {
      const latest = list.reduce((a: any, b: any) =>
        new Date(a.found_at) > new Date(b.found_at) ? a : b
      )
      setLastScraped(latest.found_at)
    }
  }, [])

  const fetchCounts = useCallback(async () => {
    const results = await Promise.all(
      TABS.map(t => fetch(`/api/jobs?status=${t.status}`).then(r => r.json()))
    )
    const c: Record<string, number> = {}
    TABS.forEach((t, i) => { c[t.status] = Array.isArray(results[i]) ? results[i].length : 0 })
    setCounts(c)
  }, [])

  useEffect(() => { fetchItems(stage) }, [stage, fetchItems])
  useEffect(() => { fetchCounts() }, [fetchCounts])

  function timeAgoShort(str: string) {
    const h = Math.floor((Date.now() - new Date(str).getTime()) / 3600000)
    return h < 1 ? 'just now' : `${h}h ago`
  }

  return (
    <div className="flex flex-col h-screen bg-[#0f1117] text-white overflow-hidden">

      {/* ── Top header ──────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-3 bg-[#161b27] border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">JA</div>
          <div>
            <span className="font-semibold text-white text-sm">Job AI</span>
            <span className="text-slate-500 text-xs ml-2">for Abdellah · Canada (excl. QC)</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          {lastScraped && <span>🕐 last scraped {timeAgoShort(lastScraped)}</span>}
          <span className="text-slate-300 font-medium">{counts['new'] || 0} matched jobs today</span>
        </div>
      </header>

      {/* ── Pipeline tabs ───────────────────────────────────────── */}
      <nav className="flex items-center gap-1 px-4 bg-[#161b27] border-b border-slate-800 shrink-0 overflow-x-auto">
        {TABS.map(({ status, label, color }) => {
          const count = counts[status] ?? 0
          const active = stage === status
          return (
            <button
              key={status}
              onClick={() => setStage(status)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${active
                  ? `border-blue-500 ${color}`
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
                }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
                  ${active ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* ── Main 2-column body ──────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Job list */}
        <div className="w-[400px] shrink-0 border-r border-slate-800 flex flex-col overflow-hidden bg-[#0f1117]">
          {loading ? (
            <div className="flex items-center justify-center flex-1 gap-2 text-slate-500 text-sm">
              <span className="w-4 h-4 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
              Loading jobs...
            </div>
          ) : (
            <JobList
              items={items}
              selectedId={selectedId}
              onSelect={setSelectedId}
              status={stage}
            />
          )}
        </div>

        {/* Right: Job detail */}
        <div className="flex-1 overflow-y-auto bg-[#0f1117]">
          {selectedId ? (
            <JobDetailPanel
              itemId={selectedId}
              stage={stage}
              items={items}
              onStatusChange={() => { fetchItems(stage); fetchCounts() }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl">👆</div>
              <p className="text-slate-300 font-medium">Select a job to view details</p>
              <p className="text-slate-600 text-sm max-w-xs">
                Jobs are filtered to your skills (50%+ match) and last 24 hours only
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
