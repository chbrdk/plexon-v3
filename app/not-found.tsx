import Link from 'next/link';
import { PATH_HOME } from '@/lib/constants';

export default function NotFound() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>404 – Seite nicht gefunden</h1>
      <p style={{ color: '#666', marginBottom: '1rem' }}>Diese URL existiert nicht.</p>
      <Link href={PATH_HOME} style={{ color: 'var(--color-theme-accent, #b638ff)', fontWeight: 600 }}>Zur Startseite</Link>
    </div>
  );
}
