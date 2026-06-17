import { createSupabaseServerClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { ChatClient } from './ChatClient';

export default async function ChatPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/signup');

  // Get active partnership
  const { data: membership } = await supabase
    .from('partnership_members')
    .select('partnership_id, partnerships(is_active)')
    .eq('member_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect('/egg');

  const partnershipId = membership.partnership_id;

  // Get partner codename (we show codename only — no PII)
  const { data: partnerRows } = await supabase
    .from('partnership_members')
    .select('member_id, members(codename)')
    .eq('partnership_id', partnershipId)
    .neq('member_id', user.id);

  const partnerCodename =
    ((partnerRows?.[0]?.members as unknown) as { codename: string } | null)?.codename ?? 'Your partner';

  // Load last 50 messages (30-day window enforced by DB retention job)
  const { data: messages } = await supabase
    .from('messages')
    .select('message_id, sender_id, text_encrypted, sent_at')
    .eq('partnership_id', partnershipId)
    .order('sent_at', { ascending: true })
    .limit(50);

  // HUMAN-OWNED: Decrypt message text here once app-layer encryption is wired
  const decryptedMessages = (messages ?? []).map((m: Record<string, unknown>) => ({
    messageId: m.message_id as string,
    senderId: m.sender_id as string,
    text: m.text_encrypted as string, // HUMAN-OWNED: decrypt with KMS
    sentAt: m.sent_at as string,
    isOwn: m.sender_id === user.id,
  }));

  return (
    <ChatClient
      memberId={user.id}
      partnershipId={partnershipId}
      partnerCodename={partnerCodename}
      initialMessages={decryptedMessages}
    />
  );
}
