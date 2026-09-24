'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase';

export default function Wall() {
  const [slips, setSlips] = useState([]);
  useEffect(() => {
    const sb = createClient();
    sb.from('northroom_slips').select('*').eq('is_public', true).order('created_at', { ascending: false }).limit(60)
      .then(({ data }) => setSlips(data || []));
  }, []);
  return (
    <div className="wrap">
      <header className="mast">
        <Link href="/" className="wordmark">North<span>room</span></Link>
        <nav className="nav"><Link href="/">Edition</Link><Link href="/desk">Desk</Link></nav>
      </header>
      <p className="kicker" style={{marginTop:28}}>Public slips</p>
      <h1 className="edition" style={{fontSize:48}}>The wall</h1>
      <div className="grid">
        {slips.map((s, i) => (
          <article className="slip" key={s.id} style={{animationDelay: `${0.04 * i}s`}}>
            <div className="meta">{new Date(s.created_at).toUTCString().slice(0, 22)}</div>
            <h2>{s.title}</h2>
            <p style={{whiteSpace:'pre-wrap'}}>{s.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
