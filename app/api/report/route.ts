import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/server';
import { createReport } from '@/packages/core/trustsafety';
import { trackServer } from '@/lib/analytics/posthog';
import type { ReportCategory } from '@/packages/core/types';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { targetCodename, category, possibleMinorInvolved, blockToo } = await req.json();

  const validCategories: ReportCategory[] = [
    'Harassment', 'InappropriateContent', 'PredatoryBehavior', 'Spam', 'Other',
  ];
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  // Look up target member by codename
  const { data: target } = await supabase
    .from('members')
    .select('member_id')
    .eq('codename', targetCodename)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: 'Target not found' }, { status: 404 });

  const report = createReport(
    { reporterId: user.id, targetId: target.member_id, category, possibleMinorInvolved },
    new Date()
  );

  const { error: rErr } = await supabase.from('reports').insert({
    report_id: report.reportId,
    reporter_id: report.reporterId,
    target_id: report.targetId,
    category: report.category,
    requires_human_escalation: report.requiresHumanEscalation,
    possible_minor_involved: report.possibleMinorInvolved,
  });

  if (rErr) {
    console.error('[report]', rErr.code);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }

  // HUMAN-OWNED: If requiresHumanEscalation, alert the moderation queue immediately.
  // HUMAN-OWNED: NCMEC CyberTipline reporting for PredatoryBehavior + possible minor.
  if (report.requiresHumanEscalation) {
    console.warn('[ESCALATION REQUIRED] report_id:', report.reportId, 'category:', report.category);
    // HUMAN-OWNED: Send alert to moderation queue (e.g., Slack webhook, email, PagerDuty)
  }

  // Block if requested
  if (blockToo) {
    await supabase.from('blocks').upsert([
      { blocker_id: user.id, blocked_id: target.member_id },
      { blocker_id: target.member_id, blocked_id: user.id },
    ], { onConflict: 'blocker_id,blocked_id' });

    // End active partnership between the two
    const { data: membership } = await supabase
      .from('partnership_members')
      .select('partnership_id')
      .eq('member_id', user.id)
      .maybeSingle();

    if (membership) {
      const { data: partnerInSame } = await supabase
        .from('partnership_members')
        .select('partnership_id')
        .eq('member_id', target.member_id)
        .eq('partnership_id', membership.partnership_id)
        .maybeSingle();

      if (partnerInSame) {
        await supabase
          .from('partnerships')
          .update({ is_active: false })
          .eq('partnership_id', membership.partnership_id);
      }
    }
  }

  trackServer({ event: 'report_submitted', memberId: user.id });

  return NextResponse.json({ ok: true });
}
