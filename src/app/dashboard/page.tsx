'use client'

import { useState, useEffect, useCallback } from 'react'
import { JobList } from './components/JobList'
import { JobDetailPanel } from './components/JobDetailPanel'
import { ApplicationStatus } from '@/lib/types'

type Stage = ApplicationStatus | 'new'

const TABS: { status: Stage; label: string; dot: string }[] = [
  { status: 'new',       label: 'New Jobs',  dot: 'bg-blue-500' },
  { status: 'tailoring', label: 'Tailoring', dot: 'bg-violet-500' },
  { status: 'review',    label: 'Review',    dot: 'bg-amber-500' },
  { status: 'applied',   label: 'Applied',   dot: 'bg-emerald-500' },
  { status: 'interview', label: 'Interview', dot: 'bg-rose-500' },
  { status: 'rejected',  label: 'Rejected',  dot: 'bg-gray-400' },
]

function timeAgoShort(str: string) {
  const h = Math.floor((Date.now() - new Date(str).getTime()) / 3600000)
  return h < 1 ? 'just now' : `${h}h ago`
}

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
        new Date(a.found_at) > new Date(b.found_at) ? a : b)
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

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-blue-200">
            JA
          </div>
          <div>
            <span className="font-bold text-gray-900 text-base">Job AI</span>
            <span className="text-gray-400 text-sm ml-2">· Abdellah · Ontario, BC & NB</span>
          </div>
        </div>
        <div className="flex items-center gap-5 text-sm">
          {lastScraped && (
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              scraped {timeAgoShort(lastScraped)}
            </span>
          )}
          <span className="font-semibold text-gray-700">
            {counts['new'] || 0} <span className="font-normal text-gray-400">matched today</span>
          </span>
        </div>
      </header>

      {/* ── Pipeline tabs ───────────────────────────────────────── */}
      <nav className="flex items-center gap-0.5 px-4 bg-white border-b border-gray-200 shrink-0 shadow-sm overflow-x-auto">
        {TABS.map(({ status, label, dot }) => {
          const count = counts[status] ?? 0
          const active = stage === status
          return (
            <button
              key={status}
              onClick={() => setStage(status)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap
                ${active
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              {active && <span className={`w-2 h-2 rounded-full ${dot}`} />}
              {label}
              {count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                  ${active
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* ── 2-column body ───────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: job list */}
        <div className="w-[420px] shrink-0 border-r border-gray-200 flex flex-col overflow-hidden bg-white">
          {loading ? (
            <div className="flex items-center justify-center flex-1 gap-2 text-gray-400 text-sm">
              <span className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
              Finding your jobs…
            </div>
          ) : (
            <JobList items={items} selectedId={selectedId} onSelect={setSelectedId} status={stage} />
          )}
        </div>

        {/* Right: detail */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {selectedId ? (
            <JobDetailPanel
              itemId={selectedId}
              stage={stage}
              items={items}
              onStatusChange={() => { fetchItems(stage); fetchCounts() }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
              <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-gray-200 flex items-center justify-center text-3xl shadow-sm">
                👆
              </div>
              <div>
                <p className="text-gray-700 font-semibold text-lg">Select a job to view details</p>
                <p className="text-gray-400 text-sm mt-1 max-w-xs">
                  Showing last 24h jobs from Ontario, BC & NB with 50%+ skill match
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
