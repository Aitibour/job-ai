'use client'

import { useEffect, useState } from 'react'
import { Application } from '@/lib/types'

const STATUS_STYLE: Record<string, string> = {
  new:       'bg-blue-900 text-blue-300',
  tailoring: 'bg-purple-900 text-purple-300',
  review:    'bg-yellow-900 text-yellow-300',
  applied:   'bg-green-900 text-green-300',
  interview: 'bg-red-900 text-red-300',
  rejected:  'bg-slate-800 text-slate-400',
}

export function ApplicationLog() {
  const [apps, setApps] = useState<(Application & { job?: any })[]>([])

  useEffect(() => {
    const statuses = ['applied', 'interview', 'rejected', 'review', 'tailoring', 'new']
    Promise.all(statuses.map(s => fetch(`/api/jobs?status=${s}`).then(r => r.json())))
      .then(results => {
        const all = results.flat().filter(Boolean)
        all.sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setApps(all)
      })
  }, [])

  return (
    <div className="p-6 overflow-auto">
      <h2 className="text-sm font-semibold text-slate-300 mb-4">Application Log</h2>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-800">
            <th className="text-left py-2 pr-4">Company</th>
            <th className="text-left py-2 pr-4">Job Title</th>
            <th className="text-left py-2 pr-4">Source</th>
            <th className="text-left py-2 pr-4">Industry</th>
            <th className="text-left py-2 pr-4">Found</th>
            <th className="text-left py-2 pr-4">Applied</th>
            <th className="text-left py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((app: any) => {
            const job = app.job || app
            return (
              <tr key={app.id} className="border-b border-slate-800/50 hover:bg-slate-900">
                <td className="py-2 pr-4 text-slate-200">{job.company}</td>
                <td className="py-2 pr-4 text-slate-300">{job.title}</td>
                <td className="py-2 pr-4 text-slate-500">{job.source}</td>
                <td className="py-2 pr-4 text-slate-500 capitalize">{job.industry}</td>
                <td className="py-2 pr-4 text-slate-500">
                  {job.found_at ? new Date(job.found_at).toLocaleDateString('en-CA') : '—'}
                </td>
                <td className="py-2 pr-4 text-slate-500">
                  {app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-CA') : '—'}
                </td>
                <td className="py-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLE[app.status] || ''}`}>
                    {app.status}
                  </span>
                </td>
              </tr>
            )
          })}
          {apps.length === 0 && (
            <tr><td colSpan={7} className="py-6 text-center text-slate-600 text-xs">No applications yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
