'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient, hourKey, prettyHour } from '../lib/supabase';

export default function Home() {
  const [hour, setHour] = useState(null);
  const [slips, setSlips] = useState([]);
  const [session, setSession] = useState(null);
  const [left, setLeft] = useState('');

  useEffect(() => {
    const sb = createClient();
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    const key = hourKey();
    sb.from('northroom_hours').select('*').eq('hour_key', key).maybeSingle()
      .then(({ data }) => {
        setHour(data || {
          hour_key: key,
          kicker: 'Hourly edition',
          title: 'Waiting on the next plate',
          body: 'The press is warm. A new edition lands at the top of every hour. Until then the wall still holds what people marked public.',
        });
      });
    sb.from('northroom_slips').select('*').eq('is_public', true).order('created_at', { ascending: false }).limit(24)
      .then(({ data }) => setSlips(data || []));
    const tick = () => {
      const now = new Date();
      const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1));
      const ms = next - now;
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLeft(`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => { sub.subscription.unsubscribe(); clearInterval(t); };
  }, []);

  return (
    <div className="wrap">
      <header className="mast">
        <Link href="/" className="wordmark">North<span>room</span></Link>
        <nav className="nav">
          <Link href="/wall">Wall</Link>
          <Link href="/desk">{session ? 'Desk' : 'Sign in'}</Link>
        </nav>
      </header>
      <div className="ticker">
        <span>{prettyHour(hour?.hour_key || hourKey())}</span>
        <span>Next plate · {left}</span>
      </div>
      <section className="hero">
        <div>
          <div className="kicker">{hour?.kicker || 'Hourly edition'}</div>
          <h1 className="edition">{hour?.title || '…'}</h1>
          <p className="lede">{hour?.body}</p>
        </div>
        <aside className="side-card">
          <h3>How the room works</h3>
          <p>Sign in. Write a slip. Keep it in the drawer or hang it on the public wall. Every hour the masthead changes. Public work can be featured.</p>
          <p style={{marginTop:16}}><Link className="btn" href="/desk">{session ? 'Open desk' : 'Take a key'}</Link></p>
        </aside>
      </section>
      <h2 className="kicker" style={{marginBottom:8}}>On the wall</h2>
      <div className="grid">
        {slips.map((s, i) => (
          <article className="slip" key={s.id} style={{animationDelay: `${0.05 * i}s`}}>
            <div className="meta">{new Date(s.created_at).toUTCString().slice(0, 22)}</div>
            <h2>{s.title}</h2>
            <p>{s.body.length > 220 ? s.body.slice(0, 220) + '…' : s.body}</p>
          </article>
        ))}
        {!slips.length && <p className="meta">The wall is empty. Be the first to hang a slip.</p>}
      </div>
    </div>
  );
}
