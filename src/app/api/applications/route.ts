import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { job_id } = await req.json()

  if (!job_id) return NextResponse.json({ error: 'job_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('applications')
    .insert({ job_id, status: 'new' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
