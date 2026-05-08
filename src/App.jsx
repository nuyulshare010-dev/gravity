import { useEffect, useRef, useState } from 'react';
import shaka from 'shaka-player';
import 'shaka-player/dist/controls.css';

/* ==================== PARSER M3U ==================== */
function parseM3U(content) {
  const lines = content.split(/\r?\n/);
  const channels = [];
  let cur = { name: '', group: '', logo: '', url: '' };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const comma = line.lastIndexOf(',');
      cur.name = comma !== -1 ? line.slice(comma + 1).trim() : 'Unknown';

      const nm = line.match(/tvg-name="([^"]*)"/);
      if (nm) cur.name = nm[1];
      const gr = line.match(/group-title="([^"]*)"/);
      if (gr) cur.group = gr[1];
      const lg = line.match(/tvg-logo="([^"]*)"/);
      if (lg) cur.logo = lg[1];

    } else if (line.startsWith('#') || line.startsWith('#KODIPROP:')) {
      continue;
    } else {
      cur.url = line;
      channels.push({ ...cur });
      cur = { name: '', group: '', logo: '', url: '' };
    }
  }
  return channels;
}

/* ==================== APP ==================== */
function App() {
  const [channels, setChannels] = useState(() => {
    try {
      const saved = localStorage.getItem('gravity_channels');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentChannel, setCurrentChannel] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [showImport, setShowImport] = useState(false);

  // form single
  const [fName, setFName] = useState('');
  const [fGroup, setFGroup] = useState('');
  const [fLogo, setFLogo] = useState('');
  const [fUrl, setFUrl] = useState('');

  // import M3U
  const [m3u, setM3u] = useState('');
  const fileRef = useRef(null);

  // player
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('gravity_channels', JSON.stringify(channels));
  }, [channels]);

  useEffect(() => {
    if (!currentChannel) return;
    shaka.polyfill.installAll();
    const v = videoRef.current;
    if (!v) return;

    const p = new shaka.Player(v);
    playerRef.current = p;
    p.load(currentChannel.url).catch(console.error);
    return () => {
      p.destroy();
      playerRef.current = null;
    };
  }, [currentChannel]);

  const play = (ch) => setCurrentChannel(ch);

  const addSingle = (e) => {
    e.preventDefault();
    if (!fUrl.trim()) return;
    const ch = {
      name: fName.trim() || 'Unnamed',
      group: fGroup.trim(),
      logo: fLogo.trim(),
      url: fUrl.trim(),
    };
    setChannels(prev => [...prev, ch]);
    if (!currentChannel) setCurrentChannel(ch);
    setFName(''); setFGroup(''); setFLogo(''); setFUrl('');
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => setM3u(ev.target.result);
    r.readAsText(file);
  };

  const importM3U = () => {
    if (!m3u.trim()) return;
    const parsed = parseM3U(m3u);
    if (parsed.length === 0) {
      alert('No valid channels found');
      return;
    }
    setChannels(prev => [...prev, ...parsed]);
    if (!currentChannel && parsed.length > 0) setCurrentChannel(parsed[0]);
    setShowImport(false);
    setM3u('');
  };

  const toggle = (group) => {
    setExpandedGroup(expandedGroup === group ? null : group);
  };

  // Grouping
  const grouped = channels.reduce((acc, ch) => {
    const g = ch.group || 'Uncategorized';
    if (!acc[g]) acc[g] = [];
    acc[g].push(ch);
    return acc;
  }, {});

  const groups = Object.keys(grouped).sort();

  return (
    <div className="app-container">
      {/* ===== SIDEBAR KIRI (selalu terlihat di desktop, drawer di mobile) ===== */}
      <aside className="sidebar">
        {/* Header sidebar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0 }}>Gravity</h2>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setShowImport(!showImport); }}>
            {showImport ? '← Back' : '+ Add'}
          </button>
        </div>

        {/* Jika sedang mode Add/Import */}
        {showImport ? (
          <div>
            {/* Single Stream */}
            <form onSubmit={addSingle} style={{ marginBottom: 20 }}>
              <div className="form-group">
                <label>Name</label>
                <input placeholder="Channel" value={fName} onChange={e => setFName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Group</label>
                <input placeholder="Sports, etc." value={fGroup} onChange={e => setFGroup(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Manifest URL</label>
                <input placeholder="https://..." required value={fUrl} onChange={e => setFUrl(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add Stream</button>
            </form>

            {/* Import M3U */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <p style={{ fontSize: '0.75rem', marginBottom: 8, color: 'var(--text-muted)' }}>or import playlist</p>
              <button className="btn btn-secondary" style={{ width: '100%', marginBottom: 8 }} onClick={() => fileRef.current?.click()}>
                Load M3U File
              </button>
              <input type="file" accept=".m3u,.m3u8,.txt" ref={fileRef} style={{ display: 'none' }} onChange={handleFile} />

              <textarea
                placeholder={`#EXTM3U\n#EXTINF:-1 tvg-name="Channel" group-title="Group",Channel\nhttps://...`}
                value={m3u}
                onChange={e => setM3u(e.target.value)}
                style={{ width: '100%', minHeight: 100, marginBottom: 8 }}
              />

              <button className="btn btn-primary" style={{ width: '100%' }} onClick={importM3U}>
                Import to Library
              </button>
            </div>
          </div>
        ) : (
          /* Daftar kategori */
          <div>
            {groups.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <p style={{ fontSize: '0.8rem' }}>No channels</p>
                <p style={{ fontSize: '0.7rem', marginTop: 6, color: 'var(--text-muted)' }}>Click "+ Add"</p>
              </div>
            ) : (
              groups.map(group => (
                <div key={group} style={{ marginBottom: 4 }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => toggle(group)}
                    style={{
                      width: '100%',
                      justifyContent: 'space-between',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      padding: '11px 12px',
                      background: expandedGroup === group ? 'var(--accent-glow)' : 'transparent',
                      color: expandedGroup === group ? 'var(--accent-light)' : 'var(--text-primary)',
                    }}
                  >
                    <span>{group}</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                      {expandedGroup === group ? '▼' : '▶'} {grouped[group].length}
                    </span>
                  </button>

                  {expandedGroup === group && (
                    <div style={{ paddingLeft: 14, marginBottom: 6 }}>
                      {grouped[group].map((ch, i) => {
                        const active = currentChannel?.url === ch.url;
                        return (
                          <button
                            key={i}
                            className="btn btn-ghost"
                            onClick={() => play(ch)}
                            style={{
                              width: '100%',
                              justifyContent: 'flex-start',
                              fontSize: '0.78rem',
                              padding: '9px 10px',
                              background: active ? 'rgba(139,92,246,0.2)' : 'transparent',
                              color: active ? 'var(--accent-light)' : 'var(--text-secondary)',
                              fontWeight: active ? 600 : 400,
                            }}
                          >
                            {active && '● '}{ch.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </aside>

      {/* ===== PLAYER AREA (kanan) ===== */}
      <main className="player-area">
        {currentChannel ? (
          <div className="video-container">
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', background: '#000' }}
              controls
              autoPlay
            />
            <div className="badge" style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
              {currentChannel.name}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 64, height: 64, opacity: 0.3 }}>
              <path d="M8 5v14l11-7z" />
            </svg>
            <p>Select a channel</p>
          </div>
        )}
      </main>

      {/* Mobile tab bar (bisa diabaikan jika tidak perlu) */}
      <div className="mobile-tab-bar">
        <button className="active">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          Player
        </button>
      </div>
    </div>
  );
}

export default App;