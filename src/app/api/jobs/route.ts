import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { ApplicationStatus } from '@/lib/types'

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as ApplicationStatus | null

  // Get jobs that have an application with the given status
  // or jobs with no application yet (status=new)
  if (status === 'new') {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, applications(*)')
      .order('industry', { ascending: false }) // hospitality sorts higher alphabetically? No - use custom sort below
      .order('found_at', { ascending: false })
      .limit(200)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Filter to jobs with no application, sort hospitality first
    const newJobs = (data || [])
      .filter((j: any) => !j.applications || j.applications.length === 0)
      .sort((a: any, b: any) => {
        if (a.industry === 'hospitality' && b.industry !== 'hospitality') return -1
        if (b.industry === 'hospitality' && a.industry !== 'hospitality') return 1
        return 0
      })

    return NextResponse.json(newJobs)
  }

  const { data, error } = await supabase
    .from('applications')
    .select('*, job:jobs(*)')
    .eq('status', status || 'new')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sort hospitality first within results
  const sorted = (data || []).sort((a: any, b: any) => {
    if (a.job?.industry === 'hospitality' && b.job?.industry !== 'hospitality') return -1
    if (b.job?.industry === 'hospitality' && a.job?.industry !== 'hospitality') return 1
    return 0
  })

  return NextResponse.json(sorted)
}
