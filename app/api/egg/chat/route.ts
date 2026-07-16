import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/server';
import { createSupabaseServiceClient } from '@/lib/db/service';
import { encryptField, decryptField } from '@/lib/crypto/fieldEncrypt';

export const dynamic = 'force-dynamic';

const MAX_CHARS = 280;

// Confirm the authenticated user is a member of the pod (service role — the
// egg_pod_members RLS policy is self-referential and Postgres blocks it as recursion).
async function isInPod(
  service: ReturnType<typeof createSupabaseServiceClient>,
  podId: string,
  memberId: string,
): Promise<boolean> {
  const { data } = await service
    .from('egg_pod_members')
    .select('pod_id')
    .eq('pod_id', podId)
    .eq('member_id', memberId)
    .maybeSingle();
  return !!data;
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { podId, text } = await req.json();

  if (!podId) return NextResponse.json({ error: 'podId required' }, { status: 400 });
  if (typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json({ error: `Message exceeds ${MAX_CHARS} characters` }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  if (!(await isInPod(service, podId, user.id))) {
    return NextResponse.json({ error: 'Not in this pod' }, { status: 403 });
  }

  const textEncrypted = await encryptField(text.trim());

  const { data: message, error } = await service
    .from('egg_messages')
    .insert({ pod_id: podId, sender_id: user.id, text_encrypted: textEncrypted })
    .select('message_id, sent_at')
    .single();

  if (error) {
    console.error('[egg chat]', error.code); // never log message content
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }

  return NextResponse.json({ messageId: message.message_id, sentAt: message.sent_at });
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const podId = searchParams.get('podId');
  const after = searchParams.get('after'); // ISO timestamp for polling

  if (!podId) return NextResponse.json({ error: 'podId required' }, { status: 400 });

  const service = createSupabaseServiceClient();
  if (!(await isInPod(service, podId, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let query = service
    .from('egg_messages')
    .select('message_id, sender_id, text_encrypted, sent_at, members(codename)')
    .eq('pod_id', podId)
    .order('sent_at', { ascending: true })
    .limit(100);

  if (after) query = query.gt('sent_at', after);

  const { data: messages } = await query;

  const decrypted = await Promise.all(
    (messages ?? []).map(async (m: Record<string, unknown>) => {
      let text = '[unavailable]';
      try { text = await decryptField(m.text_encrypted as string); } catch { /* skip */ }
      return {
        messageId: m.message_id,
        senderId: m.sender_id,
        senderCodename: (m.members as Record<string, unknown> | null)?.codename ?? 'Anonymous',
        text,
        sentAt: m.sent_at,
        isOwn: m.sender_id === user.id,
      };
    })
  );

  return NextResponse.json({ messages: decrypted });
}


