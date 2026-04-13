import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { ApplicationStatus } from '@/lib/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if (body.status) updates.status = body.status as ApplicationStatus
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.status === 'applied') updates.applied_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('applications')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
