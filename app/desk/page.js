'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase';

export default function Desk() {
  const sb = createClient();
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [slips, setSlips] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [handle, setHandle] = useState('');

  async function load(user) {
    const { data } = await sb.from('northroom_slips').select('*').eq('author_id', user.id).order('created_at', { ascending: false });
    setSlips(data || []);
    const { data: p } = await sb.from('northroom_profiles').select('*').eq('id', user.id).maybeSingle();
    if (p) setHandle(p.handle);
  }

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) load(data.session.user);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) load(s.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function auth(e) {
    e.preventDefault();
    setErr(''); setMsg('');
    if (mode === 'signup') {
      const { error } = await sb.auth.signUp({ email, password });
      if (error) setErr(error.message);
      else setMsg('Account created. You can sign in now.');
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setErr(error.message);
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    const user = session.user;
    const clean = handle.replace(/[^a-z0-9_]/gi, '').toLowerCase().slice(0, 32);
    const { error } = await sb.from('northroom_profiles').upsert({
      id: user.id,
      handle: clean || ('reader' + user.id.slice(0,6)),
      display_name: clean || 'Anonymous',
    });
    if (error) setErr(error.message); else setMsg('Handle saved.');
  }

  async function saveSlip(e) {
    e.preventDefault();
    setErr('');
    const { error } = await sb.from('northroom_slips').insert({
      author_id: session.user.id,
      title: title.trim(),
      body: body.trim(),
      is_public: isPublic,
    });
    if (error) setErr(error.message);
    else {
      setTitle(''); setBody(''); setIsPublic(false);
      setMsg(isPublic ? 'Hung on the wall.' : 'Filed in the drawer.');
      load(session.user);
    }
  }

  async function toggle(slip) {
    await sb.from('northroom_slips').update({ is_public: !slip.is_public, updated_at: new Date().toISOString() }).eq('id', slip.id);
    load(session.user);
  }
  async function remove(id) {
    await sb.from('northroom_slips').delete().eq('id', id);
    load(session.user);
  }

  return (
    <div className="wrap">
      <header className="mast">
        <Link href="/" className="wordmark">North<span>room</span></Link>
        <nav className="nav">
          <Link href="/wall">Wall</Link>
          {session && <button className="btn ghost" onClick={() => sb.auth.signOut()}>Sign out</button>}
        </nav>
      </header>
      {!session ? (
        <section style={{paddingTop:36,maxWidth:480}}>
          <p className="kicker">Keys</p>
          <h1 className="edition" style={{fontSize:48}}>The desk</h1>
          <form className="form" onSubmit={auth}>
            <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label>
            <label>Password<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} /></label>
            <div className="row">
              <button className="btn" type="submit">{mode === 'signup' ? 'Create key' : 'Unlock'}</button>
              <button type="button" className="btn ghost" onClick={()=>setMode(mode==='signup'?'signin':'signup')}>
                {mode === 'signup' ? 'Have a key?' : 'Need a key?'}
              </button>
            </div>
            {err && <p className="err">{err}</p>}
            {msg && <p className="ok">{msg}</p>}
          </form>
        </section>
      ) : (
        <section style={{paddingTop:28}}>
          <p className="kicker">Private drawer + public wall</p>
          <h1 className="edition" style={{fontSize:48}}>Your desk</h1>
          <form className="form" onSubmit={saveProfile} style={{marginBottom:36}}>
            <label>Handle<input value={handle} onChange={e=>setHandle(e.target.value)} placeholder="inkwell" /></label>
            <button className="btn ghost" type="submit">Save handle</button>
          </form>
          <form className="form" onSubmit={saveSlip}>
            <label>Title<input required maxLength={140} value={title} onChange={e=>setTitle(e.target.value)} /></label>
            <label>Slip<textarea required maxLength={8000} value={body} onChange={e=>setBody(e.target.value)} /></label>
            <label className="check"><input type="checkbox" checked={isPublic} onChange={e=>setIsPublic(e.target.checked)} /> Hang this on the public wall</label>
            <button className="btn" type="submit">File slip</button>
          </form>
          {err && <p className="err">{err}</p>}
          {msg && <p className="ok">{msg}</p>}
          <h2 className="kicker" style={{marginTop:40}}>Filed</h2>
          <div className="list">
            {slips.map(s => (
              <div className="item" key={s.id}>
                <div>
                  <div className="meta">{s.is_public ? 'Public' : 'Drawer'} · {new Date(s.created_at).toUTCString().slice(5,22)}</div>
                  <strong>{s.title}</strong>
                  <p>{s.body.slice(0,180)}{s.body.length>180?'…':''}</p>
                </div>
                <div className="row">
                  <button className="btn ghost" onClick={()=>toggle(s)}>{s.is_public ? 'Unhang' : 'Hang'}</button>
                  <button className="btn ghost" onClick={()=>remove(s.id)}>Burn</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
