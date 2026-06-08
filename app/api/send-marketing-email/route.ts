import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerClientInstance } from '@/lib/supabase'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { sendEmailBatch, buildMarketingEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const { allowed, resetIn } = rateLimit(request, 'send-marketing-email')
  if (!allowed) return rateLimitResponse(resetIn)

  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role?: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
  }

  const { campaign_id, subject, content, recipient_ids } = await request.json()
  if (!campaign_id || !subject || !content || !recipient_ids?.length) {
    return NextResponse.json({ error: 'campaign_id, subject, content, recipient_ids required' }, { status: 400 })
  }

  const { data: campaignData } = await db.from('marketing_campaigns').select('*').eq('id', campaign_id).single()
  const campaign = campaignData as Record<string, unknown> | null
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (campaign.status === 'sent' || campaign.status === 'sending') {
    return NextResponse.json({ error: `Campaign already ${campaign.status}` }, { status: 400 })
  }

  await db.from('marketing_campaigns').update({ status: 'sending', total_recipients: recipient_ids.length }).eq('id', campaign_id)

  try {
    const { data: recipients } = await db.from('profiles').select('id, full_name').in('id', recipient_ids).eq('email_opt_in', true)
    const recips = (recipients || []) as Array<{ id: string; full_name: string | null }>

    if (!recips.length) {
      await db.from('marketing_campaigns').update({ status: 'sent', sent_count: 0 }).eq('id', campaign_id)
      return NextResponse.json({ success: true, sent: 0, message: 'No opted-in recipients' })
    }

    const emailMap = new Map<string, string>()
    for (const r of recips) {
      try {
        const { data } = await db.auth.admin.getUserById(r.id)
        if (data?.user?.email) emailMap.set(r.id, data.user.email)
      } catch { /* skip */ }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!
    const emails = recips.filter(r => emailMap.has(r.id)).map(r => {
      const email = emailMap.get(r.id)!
      const unsubscribeUrl = `${appUrl}/unsubscribe?uid=${r.id}&campaign=${campaign_id}`
      return { to: email, subject, html: buildMarketingEmail(subject, content, unsubscribeUrl) }
    })

    const { sent, failed } = await sendEmailBatch(emails, 50, 2000)

    await db.from('marketing_campaigns').update({ status: 'sent', sent_count: sent, failed_count: failed, sent_at: new Date().toISOString() }).eq('id', campaign_id)

    const recipientRows = recips.filter(r => emailMap.has(r.id)).map(r => ({
      campaign_id, user_id: r.id, email: emailMap.get(r.id)!, status: 'sent' as const, sent_at: new Date().toISOString(),
    }))
    await db.from('campaign_recipients').upsert(recipientRows, { onConflict: 'campaign_id,user_id' })

    return NextResponse.json({ success: true, sent, failed, total: emails.length })
  } catch (error) {
    console.error('[send-marketing-email]', error)
    await db.from('marketing_campaigns').update({ status: 'failed' }).eq('id', campaign_id)
    return NextResponse.json({ error: 'Campaign send failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const uid = searchParams.get('uid')
  if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 })
  const db = createAdminClient()
  await db.from('profiles').update({ email_opt_in: false }).eq('id', uid)
  return NextResponse.json({ success: true, message: 'Unsubscribed successfully' })
}
