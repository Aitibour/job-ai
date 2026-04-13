'use client'

import { useState, useEffect, useCallback } from 'react'
import { PipelineSidebar } from './components/PipelineSidebar'
import { JobList } from './components/JobList'
import { JobDetailPanel } from './components/JobDetailPanel'
import { ApplicationStatus } from '@/lib/types'

type Stage = ApplicationStatus | 'new'

export default function DashboardPage() {
  const [stage, setStage] = useState<Stage>('new')
  const [items, setItems] = useState<any[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchItems = useCallback(async (s: Stage) => {
    setLoading(true)
    setSelectedId(null)
    const res = await fetch(`/api/jobs?status=${s}`)
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  const fetchCounts = useCallback(async () => {
    const stages: Stage[] = ['new', 'tailoring', 'review', 'applied', 'interview', 'rejected']
    const results = await Promise.all(
      stages.map(s => fetch(`/api/jobs?status=${s}`).then(r => r.json()))
    )
    const c: Record<string, number> = {}
    stages.forEach((s, i) => { c[s] = Array.isArray(results[i]) ? results[i].length : 0 })
    setCounts(c)
  }, [])

  useEffect(() => { fetchItems(stage) }, [stage, fetchItems])
  useEffect(() => { fetchCounts() }, [fetchCounts])

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <PipelineSidebar selected={stage} counts={counts} onSelect={setStage} />
      <div className="w-80 shrink-0 border-r border-slate-800 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-slate-500 text-sm">Loading...</div>
        ) : (
          <JobList items={items} selectedId={selectedId} onSelect={setSelectedId} status={stage} />
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {selectedId ? (
          <JobDetailPanel
            itemId={selectedId}
            stage={stage}
            items={items}
            onStatusChange={() => { fetchItems(stage); fetchCounts() }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-600 text-sm">
            Select a job to view details
          </div>
        )}
      </div>
    </div>
  )
}
