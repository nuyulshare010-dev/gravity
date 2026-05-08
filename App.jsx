import { useEffect, useRef, useState } from 'react';
import shaka from 'shaka-player';
import 'shaka-player/dist/controls.css';

/* ==================== PARSER M3U ==================== */
function parseM3U(content) {
  const lines = content.split(/\r?\n/);
  const channels = [];
  let current = { name: '', group: '', logo: '', url: '' };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const commaIdx = line.lastIndexOf(',');
      current.name = commaIdx !== -1 ? line.substring(commaIdx + 1).trim() : 'Unknown';

      const tvgName = line.match(/tvg-name="([^"]*)"/);
      if (tvgName) current.name = tvgName[1];

      const groupTitle = line.match(/group-title="([^"]*)"/);
      if (groupTitle) current.group = groupTitle[1];

      const tvgLogo = line.match(/tvg-logo="([^"]*)"/);
      if (tvgLogo) current.logo = tvgLogo[1];

    } else if (line.startsWith('#') || line.startsWith('#KODIPROP:')) {
      continue;
    } else {
      current.url = line;
      channels.push({ ...current });
      current = { name: '', group: '', logo: '', url: '' };
    }
  }
  return channels;
}

/* ==================== KOMPONEN UTAMA ==================== */
function App() {
  /* ---------- DATA CHANNELS ---------- */
  const [channels, setChannels] = useState(() => {
    try {
      const saved = localStorage.getItem('gravity_channels');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentChannel, setCurrentChannel] = useState(null);

  useEffect(() => {
    localStorage.setItem('gravity_channels', JSON.stringify(channels));
  }, [channels]);

  /* ---------- UI STATE ---------- */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);       // halaman "Library" (Single Stream / Import M3U)
  const [showImportM3U, setShowImportM3U] = useState(false);   // modal import M3U
  const [expandedGroup, setExpandedGroup] = useState(null);    // kategori yang sedang terbuka (null = semua tutup)

  /* ---------- FORM SINGLE STREAM ---------- */
  const [formName, setFormName] = useState('');
  const [formGroup, setFormGroup] = useState('');
  const [formLogo, setFormLogo] = useState('');
  const [formUrl, setFormUrl] = useState('');

  /* ---------- MODAL IMPORT M3U ---------- */
  const [m3uContent, setM3uContent] = useState('');
  const fileInputRef = useRef(null);

  /* ---------- PLAYER ---------- */
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!currentChannel) return;

    shaka.polyfill.installAll();
    const video = videoRef.current;
    if (!video) return;

    const player = new shaka.Player(video);
    playerRef.current = player;
    player.load(currentChannel.url).catch(console.error);

    return () => {
      player.destroy();
      playerRef.current = null;
    };
  }, [currentChannel]);

  /* ---------- FUNCTIONS ---------- */

  // Buka sidebar
  const openSidebar = () => {
    setSidebarOpen(true);
    // Reset ke tampilan daftar kategori (bukan library)
    setShowLibrary(false);
    setShowImportM3U(false);
  };

  // Tambah single stream
  const addSingleStream = (e) => {
    e.preventDefault();
    if (!formUrl.trim()) return;
    const newCh = {
      name: formName.trim() || 'Unnamed',
      group: formGroup.trim(),
      logo: formLogo.trim(),
      url: formUrl.trim(),
    };
    setChannels(prev => [...prev, newCh]);
    if (!currentChannel) setCurrentChannel(newCh);
    // Reset form, kembali ke kategori, tutup sidebar
    setFormName(''); setFormGroup(''); setFormLogo(''); setFormUrl('');
    setShowLibrary(false);
    setSidebarOpen(false);
  };

  // Load file M3U dari HP
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setM3uContent(ev.target.result);
    reader.readAsText(file);
  };

  // Import M3U
  const importM3U = () => {
    if (!m3uContent.trim()) return;
    const parsed = parseM3U(m3uContent);
    if (parsed.length === 0) {
      alert('Tidak ada channel valid di M3U.');
      return;
    }
    setChannels(prev => [...prev, ...parsed]);
    if (!currentChannel && parsed.length > 0) setCurrentChannel(parsed[0]);

    // Kembali ke daftar kategori, tutup semua modal
    setShowImportM3U(false);
    setShowLibrary(false);
    setM3uContent('');
  };

  // Klik channel → putar
  const playChannel = (ch) => {
    setCurrentChannel(ch);
    setSidebarOpen(false); // tutup sidebar setelah pilih
  };

  // Klik kategori → expand/collapse
  const toggleGroup = (group) => {
    setExpandedGroup(expandedGroup === group ? null : group);
  };

  /* ---------- PENGELOMPOKAN CHANNELS ---------- */
  const grouped = channels.reduce((acc, ch) => {
    const group = ch.group || 'Uncategorized';
    if (!acc[group]) acc[group] = [];
    acc[group].push(ch);
    return acc;
  }, {});

  /* ========== RENDER ========== */
  return (
    <div className="app-container">
      {/* ====== HEADER MOBILE ====== */}
      <div className="mobile-nav" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="hamburger-btn" onClick={openSidebar} aria-label="Menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 style={{ margin: 0 }}>Gravity</h1>
        </div>
      </div>

      {/* ====== OVERLAY DRAWER (MOBILE) ====== */}
      <div
        className={`drawer-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => { setSidebarOpen(false); setShowLibrary(false); setShowImportM3U(false); }}
      />

      {/* ====== SIDEBAR ====== */}
      <aside className={`sidebar ${sidebarOpen ? 'drawer-open' : ''}`}>
        {/* Tampilan Library: pilih Single Stream / Import M3U */}
        {showLibrary && !showImportM3U && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2>Add Stream</h2>
              <button
                className="btn btn-ghost"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                onClick={() => setShowLibrary(false)}
              >
                ← Back
              </button>
            </div>

            {/* Single Stream Form */}
            <form onSubmit={addSingleStream} style={{ marginBottom: 24 }}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" placeholder="Channel name" value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Group (optional)</label>
                <input type="text" placeholder="Sports, Movies, etc." value={formGroup} onChange={e => setFormGroup(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Logo URL (optional)</label>
                <input type="text" placeholder="https://..." value={formLogo} onChange={e => setFormLogo(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Manifest URL</label>
                <input type="text" placeholder="https://..." required value={formUrl} onChange={e => setFormUrl(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add to Library</button>
            </form>

            <button
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={() => setShowImportM3U(true)}
            >
              Load M3U File
            </button>
          </div>
        )}

        {/* Tampilan Import M3U (di dalam sidebar) */}
        {showLibrary && showImportM3U && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2>Load M3U File</h2>
              <button
                className="btn btn-ghost"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                onClick={() => setShowImportM3U(false)}
              >
                ← Back
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: '0.8rem' }}>
              or paste content below
            </p>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: 12 }}
              onClick={() => fileInputRef.current?.click()}
            >
              Load M3U File
            </button>
            <input
              type="file"
              accept=".m3u,.m3u8,.txt"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <textarea
              placeholder={`#EXTM3U\n#EXTINF:-1 tvg-name="Channel" group-title="Group",Channel Name\nhttps://stream.url`}
              value={m3uContent}
              onChange={e => setM3uContent(e.target.value)}
              style={{ width: '100%', minHeight: 140, marginBottom: 12 }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={importM3U}>
                Import to Library
              </button>
              <button className="btn btn-ghost" onClick={() => setShowImportM3U(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tampilan default sidebar: daftar kategori */}
        {!showLibrary && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2>Menu</h2>
              <button
                className="btn btn-ghost"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                onClick={() => setSidebarOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Tombol Single Stream */}
            <button
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 8 }}
              onClick={() => setShowLibrary(true)}
            >
              📺 Single Stream
            </button>

            {/* Tombol Import M3U (langsung ke modal) */}
            <button
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 20 }}
              onClick={() => { setShowLibrary(true); setShowImportM3U(true); }}
            >
              📂 Load M3U File
            </button>

            {/* Garis pembatas */}
            <div style={{ borderTop: '1px solid var(--border)', marginBottom: 16 }} />

            {/* Daftar kategori */}
            {channels.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <p style={{ fontSize: '0.8rem' }}>No channels yet</p>
                <p style={{ fontSize: '0.7rem', marginTop: 6, color: 'var(--text-muted)' }}>
                  Add via Single Stream or Import M3U
                </p>
              </div>
            ) : (
              Object.keys(grouped)
                .sort()
                .map((group) => (
                  <div key={group} style={{ marginBottom: 6 }}>
                    {/* Kategori (seperti channel group di HARAMTV) */}
                    <button
                      className="btn btn-ghost"
                      onClick={() => toggleGroup(group)}
                      style={{
                        width: '100%',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        fontWeight: 500,
                        fontSize: '0.85rem',
                        padding: '12px 12px',
                        background: expandedGroup === group ? 'var(--accent-glow)' : 'transparent',
                        color: expandedGroup === group ? 'var(--accent-light)' : 'var(--text-primary)',
                      }}
                    >
                      <span>{group}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {expandedGroup === group ? '▼' : '▶'} {grouped[group].length}
                      </span>
                    </button>

                    {/* Daftar channel dalam kategori */}
                    {expandedGroup === group && (
                      <div style={{ paddingLeft: 16, marginBottom: 8 }}>
                        {grouped[group].map((ch, idx) => {
                          const isActive = currentChannel?.url === ch.url;
                          return (
                            <button
                              key={idx}
                              className="btn btn-ghost"
                              onClick={() => playChannel(ch)}
                              style={{
                                width: '100%',
                                justifyContent: 'flex-start',
                                textAlign: 'left',
                                fontWeight: isActive ? 600 : 400,
                                fontSize: '0.78rem',
                                padding: '8px 10px',
                                background: isActive ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                                color: isActive ? 'var(--accent-light)' : 'var(--text-secondary)',
                              }}
                            >
                              {isActive && '● '}{ch.name}
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

      {/* ====== PLAYER AREA ====== */}
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
            <p>Select a channel to play</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;