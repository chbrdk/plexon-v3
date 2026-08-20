/** Tavus iframe URL helper — mirrors audion-v3/lib/tavus/ids.ts */
export function tavusEmbedUrl(conversationUrl: string, meetingToken?: string | null): string {
  const token = meetingToken?.trim();
  if (!token) return conversationUrl;
  const sep = conversationUrl.includes('?') ? '&' : '?';
  return `${conversationUrl}${sep}t=${encodeURIComponent(token)}`;
}
