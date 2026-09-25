import { Text } from '@msqdx/ui'
import { resolveClientRoomByToken } from '@/lib/collection-client-room'

/**
 * Public ClientRoom — approved slots only (Enterprise E2).
 */
export default async function ShareRoomPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  if (!process.env.DATABASE_URL) {
    return (
      <main className="plexon-magazine" style={{ padding: '2rem' }}>
        <Text role="headline" as="h1">
          Kundenraum
        </Text>
        <Text role="meta">Dienst nicht konfiguriert.</Text>
      </main>
    )
  }

  const result = await resolveClientRoomByToken(token)
  if (!result.ok) {
    return (
      <main className="plexon-magazine" style={{ padding: '2rem' }}>
        <Text role="headline" as="h1">
          Kundenraum
        </Text>
        <Text role="meta">{result.error}</Text>
      </main>
    )
  }

  const slots = Object.entries(result.room.slots).filter(([, v]) => v != null)

  return (
    <main
      className="plexon-magazine"
      style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}
      data-testid="share-client-room"
    >
      <Text role="meta" as="p">
        Kundenraum · rev {result.room.revision}
      </Text>
      <Text role="headline" as="h1">
        {result.projectName}
      </Text>
      <Text role="meta" as="p">
        Nur freigegebene Stände. Entwürfe erscheinen hier nicht.
      </Text>

      {slots.length === 0 ? (
        <Text role="meta" as="p">
          Noch keine freigegebenen Inhalte.
        </Text>
      ) : (
        <ul className="plexon-project-bindings">
          {slots.map(([slotId, slot]) => (
            <li key={slotId} className="plexon-project-binding">
              <div className="plexon-project-binding__main">
                <Text role="title" as="h2">
                  {slot!.title}
                </Text>
                <Text role="meta">
                  {slotId} · {slot!.productId} ·{' '}
                  {new Date(slot!.approvedAt).toLocaleDateString()}
                </Text>
              </div>
              {slot!.href ? (
                <a href={slot!.href} target="_blank" rel="noopener noreferrer">
                  Öffnen
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
