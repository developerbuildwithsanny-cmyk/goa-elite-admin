import { getSupabaseAdmin } from '@/app/lib/supabase'

export async function GET() {
  const admin = getSupabaseAdmin()
  if (!admin) {
    return Response.json({ error: 'Supabase admin client not configured' }, { status: 503 })
  }

  const { data, error } = await admin
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Admin API] Leads fetch error:', error)
    return Response.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }

  return Response.json({ leads: data })
}

export async function PATCH(request: Request) {
  try {
    const admin = getSupabaseAdmin()
    if (!admin) {
      return Response.json({ error: 'Supabase admin client not configured' }, { status: 503 })
    }

    const body = await request.json()
    const { id, status, admin_comment } = body

    if (!id) {
      return Response.json({ error: 'Missing lead id' }, { status: 400 })
    }

    const updates: Record<string, any> = {}
    if (status !== undefined) updates.status = status

    if (admin_comment !== undefined) {
      const { data: existingLead } = await admin.from('leads').select('message').eq('id', id).single()
      let msg = existingLead?.message || ''
      msg = msg.replace(/\s*\[Comment:[^\]]+\]/gi, '').trim()
      if (admin_comment && admin_comment.trim()) {
        msg = msg ? `${msg} [Comment: ${admin_comment.trim()}]` : `[Comment: ${admin_comment.trim()}]`
      }
      updates.message = msg || null
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ success: true, message: 'No valid update fields provided' })
    }

    const { data, error } = await admin
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) {
      console.error('[Admin API] Lead update error:', error)
      return Response.json({ error: 'Failed to update lead' }, { status: 500 })
    }

    return Response.json({ success: true, data })
  } catch (err) {
    console.error('[Admin API] PATCH error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
