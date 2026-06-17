import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/server';
import { encryptField, decryptField } from '@/lib/crypto/fieldEncrypt';

const MAX_CHARS = 280;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { partnershipId, text } = await req.json();

  if (typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json({ error: `Message exceeds ${MAX_CHARS} characters` }, { status: 400 });
  }

  // Verify membership
  const { data: membership } = await supabase
    .from('partnership_members')
    .select('partnership_id')
    .eq('member_id', user.id)
    .eq('partnership_id', partnershipId)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: 'Not in this partnership' }, { status: 403 });

  const textEncrypted = await encryptField(text);

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      partnership_id: partnershipId,
      sender_id: user.id,
      text_encrypted: textEncrypted,
    })
    .select('message_id, sent_at')
    .single();

  if (error) {
    console.error('[chat]', error.code); // no message content in logs
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }

  return NextResponse.json({ messageId: message.message_id, sentAt: message.sent_at });
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const partnershipId = searchParams.get('partnershipId');
  const after = searchParams.get('after'); // ISO timestamp for polling

  if (!partnershipId) return NextResponse.json({ error: 'partnershipId required' }, { status: 400 });

  // Verify membership
  const { data: membership } = await supabase
    .from('partnership_members')
    .select('partnership_id')
    .eq('member_id', user.id)
    .eq('partnership_id', partnershipId)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let query = supabase
    .from('messages')
    .select('message_id, sender_id, text_encrypted, sent_at')
    .eq('partnership_id', partnershipId)
    .order('sent_at', { ascending: true })
    .limit(50);

  if (after) query = query.gt('sent_at', after);

  const { data: messages } = await query;

  const decrypted = await Promise.all(
    (messages ?? []).map(async (m: Record<string, unknown>) => ({
      messageId: m.message_id,
      senderId: m.sender_id,
      text: await decryptField(m.text_encrypted as string),
      sentAt: m.sent_at,
      isOwn: m.sender_id === user.id,
    }))
  );

  return NextResponse.json({ messages: decrypted });
}
