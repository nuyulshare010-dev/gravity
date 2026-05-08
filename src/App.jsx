import { useEffect, useRef, useState } from 'react';
import shaka from 'shaka-player';
import 'shaka-player/dist/controls.css';

// ==================== PARSER M3U SEDERHANA ====================
function parseM3U(content) {
  const lines = content.split(/\r?\n/);
  const channels = [];
  let currentName = '';
  let currentGroup = '';
  let currentLogo = '';
  let currentUrl = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('#EXTINF:')) {
      // Ambil nama channel setelah koma terakhir
      const commaIndex = trimmed.lastIndexOf(',');
      currentName = commaIndex !== -1 ? trimmed.substring(commaIndex + 1).trim() : 'Unknown';

      // Cari atribut tvg-name, group-title, tvg-logo
      const nameMatch = trimmed.match(/tvg-name="([^"]*)"/);
      if (nameMatch) currentName = nameMatch[1];

      const groupMatch = trimmed.match(/group-title="([^"]*)"/);
      if (groupMatch) currentGroup = groupMatch[1];

      const logoMatch = trimmed.match(/tvg-logo="([^"]*)"/);
      if (logoMatch) currentLogo = logoMatch[1];

    } else if (trimmed.startsWith('#KODIPROP:')) {
      // DRM info bisa disimpan jika diperlukan, sementara diabaikan
    } else if (trimmed.startsWith('#')) {
      // Komentar lain diabaikan
    } else {
      // Ini URL stream
      currentUrl = trimmed;
      if (currentUrl) {
        channels.push({
          name: currentName || 'Unnamed',
          group: currentGroup || '',
          logo: currentLogo || '',
          url: currentUrl,
        });
        // Reset
        currentName = '';
        currentGroup = '';
        currentLogo = '';
        currentUrl = '';
      }
    }
  }
  return channels;
}

// ==================== KOMPONEN UTAMA ====================
function App() {
  // State global
  const [activeTab, setActiveTab] = useState('player'); // 'library' atau 'player'
  const [channels, setChannels] = useState(() => {
    try {
      const saved = localStorage.getItem('gravity_channels');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentChannel, setCurrentChannel] = useState(null);

  // Simpan channels ke localStorage setiap berubah
  useEffect(() => {
    localStorage.setItem('gravity_channels', JSON.stringify(channels));
  }, [channels]);

  // ========== STATE UNTUK FORM SINGLE STREAM ==========
  const [formName, setFormName] = useState('');
  const [formGroup, setFormGroup] = useState('');
  const [formLogo, setFormLogo] = useState('');
  const [formUrl, setFormUrl] = useState('');

  // ========== STATE UNTUK IMPORT M3U ==========
  const [showM3UModal, setShowM3UModal] = useState(false);
  const [m3uContent, setM3uContent] = useState('');

  // Tambah satu channel
  const addChannel = (channel) => {
    setChannels(prev => [...prev, channel]);
    // Jika belum ada channel aktif, set sebagai aktif
    if (!currentChannel) {
      setCurrentChannel(channel);
    }
    // Reset form
    setFormName('');
    setFormGroup('');
    setFormLogo('');
    setFormUrl('');
  };

  // Hapus channel
  const removeChannel = (index) => {
    const newChannels = channels.filter((_, i) => i !== index);
    setChannels(newChannels);
    // Jika yang dihapus adalah channel aktif, pindah ke channel lain atau null
    if (currentChannel && index === channels.indexOf(currentChannel)) {
      setCurrentChannel(newChannels.length > 0 ? newChannels[0] : null);
    }
  };

  // Submit form single stream
  const handleAddSingle = (e) => {
    e.preventDefault();
    if (!formUrl.trim()) return;
    const newChannel = {
      name: formName.trim() || 'Unnamed',
      group: formGroup.trim(),
      logo: formLogo.trim(),
      url: formUrl.trim(),
    };
    addChannel(newChannel);
  };

  // Import M3U dari textarea
  const handleImportM3U = () => {
    if (!m3uContent.trim()) return;
    const parsed = parseM3U(m3uContent);
    if (parsed.length === 0) {
      alert('Tidak ada channel valid ditemukan di M3U.');
      return;
    }
    setChannels(prev => [...prev, ...parsed]);
    if (!currentChannel && parsed.length > 0) {
      setCurrentChannel(parsed[0]);
    }
    setShowM3UModal(false);
    setM3uContent('');
  };

  // ========== PLAYER LOGIC ==========
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  // Inisialisasi player hanya saat ada currentChannel dan tab Player
  useEffect(() => {
    if (activeTab !== 'player' || !currentChannel) return;

    shaka.polyfill.installAll();
    const video = videoRef.current;
    if (!video) return;

    const player = new shaka.Player(video);
    playerRef.current = player;

    player.load(currentChannel.url).catch(console.error);

    player.addEventListener('error', (event) => {
      console.error('Shaka error', event.detail);
    });

    return () => {
      player.destroy();
      playerRef.current = null;
    };
  }, [activeTab, currentChannel]);

  // Saat pindah channel dari sidebar
  const switchChannel = (channel) => {
    setCurrentChannel(channel);
  };

  // Reset semua
  const clearAll = () => {
    if (window.confirm('Hapus semua channel?')) {
      setChannels([]);
      setCurrentChannel(null);
    }
  };

  return (
    <div className="app-container">
      {/* ====== HEADER (MOBILE & DESKTOP) ====== */}
      <div className="mobile-nav" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="hamburger-btn"
            onClick={() => {
              // Di Player, hamburger bisa toggle sidebar (seperti sebelumnya)
              // Jika ingin selalu menuju Library, bisa diubah. Di sini kita biarkan toggle.
            }}
            style={{ visibility: activeTab === 'player' ? 'visible' : 'hidden' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 style={{ margin: 0 }}>Gravity</h1>
        </div>

        <div className="header-tabs">
          <button
            className={activeTab === 'library' ? 'active' : ''}
            onClick={() => setActiveTab('library')}
          >
            Library
          </button>
          <button
            className={activeTab === 'player' ? 'active' : ''}
            onClick={() => setActiveTab('player')}
          >
            Player
          </button>
        </div>
      </div>

      {/* ====== KONTEN UTAMA ====== */}
      {activeTab === 'library' && (
        <div className="library-container">
          <h2>Add Stream</h2>

          {/* Form Single Stream */}
          <form onSubmit={handleAddSingle} style={{ marginBottom: 32 }}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                placeholder="Channel name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Group (optional)</label>
              <input
                type="text"
                placeholder="Sports, Movies, etc."
                value={formGroup}
                onChange={(e) => setFormGroup(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Logo URL (optional)</label>
              <input
                type="text"
                placeholder="https://..."
                value={formLogo}
                onChange={(e) => setFormLogo(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Manifest URL</label>
              <input
                type="text"
                placeholder="https://example.com/stream.mpd"
                required
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Add to Library
            </button>
          </form>

          {/* Import M3U */}
          <div>
            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginBottom: 10 }}
              onClick={() => setShowM3UModal(true)}
            >
              Import M3U
            </button>
            {channels.length > 0 && (
              <button className="btn btn-danger" style={{ width: '100%' }} onClick={clearAll}>
                Clear All Channels
              </button>
            )}
          </div>

          {/* Modal Import M3U */}
          {showM3UModal && (
            <div className="modal-overlay" onClick={() => setShowM3UModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Load M3U File</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: '0.8rem' }}>
                  or paste content below
                </p>
                <textarea
                  placeholder="#EXTM3U&#10;#EXTINF:-1,Channel Name&#10;https://stream.url"
                  value={m3uContent}
                  onChange={(e) => setM3uContent(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-primary" onClick={handleImportM3U}>
                    Import to Library
                  </button>
                  <button className="btn btn-ghost" onClick={() => setShowM3UModal(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'player' && (
        <>
          {/* Sidebar + Player (desktop layout) */}
          <div className="sidebar">
            <h2>Channels</h2>
            {channels.length === 0 ? (
              <div className="empty-state">
                <p>No channels added yet</p>
                <p style={{ fontSize: '0.8rem', marginTop: 8 }}>
                  Go to <strong>Library</strong> to add streams
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {channels.map((ch, i) => {
                  const isActive = currentChannel && ch.url === currentChannel.url;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        className="btn btn-ghost"
                        onClick={() => switchChannel(ch)}
                        style={{
                          flex: 1,
                          justifyContent: 'flex-start',
                          fontWeight: isActive ? 600 : 400,
                          background: isActive ? 'var(--accent-glow)' : 'transparent',
                          color: isActive ? 'var(--accent-light)' : 'var(--text-secondary)',
                          textAlign: 'left',
                        }}
                      >
                        {ch.name}
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '6px', color: 'var(--danger)' }}
                        onClick={() => removeChannel(i)}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" />
                </svg>
                <p>Select a channel from the list</p>
              </div>
            )}
          </main>
        </>
      )}

      {/* ====== MOBILE TAB BAR (hanya estetika, bisa dihapus) ====== */}
      <div className="mobile-tab-bar">
        <button
          className={activeTab === 'library' ? 'active' : ''}
          onClick={() => setActiveTab('library')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 6h2v2H4V6zm4 0h12v2H8V6zM4 11h2v2H4v-2zm4 0h12v2H8v-2zM4 16h2v2H4v-2zm4 0h12v2H8v-2z" />
          </svg>
          Library
        </button>
        <button
          className={activeTab === 'player' ? 'active' : ''}
          onClick={() => setActiveTab('player')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          Player
        </button>
      </div>
    </div>
  );
}

export default App;