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
      const commaIndex = trimmed.lastIndexOf(',');
      currentName = commaIndex !== -1 ? trimmed.substring(commaIndex + 1).trim() : 'Unknown';

      const nameMatch = trimmed.match(/tvg-name="([^"]*)"/);
      if (nameMatch) currentName = nameMatch[1];

      const groupMatch = trimmed.match(/group-title="([^"]*)"/);
      if (groupMatch) currentGroup = groupMatch[1];

      const logoMatch = trimmed.match(/tvg-logo="([^"]*)"/);
      if (logoMatch) currentLogo = logoMatch[1];

    } else if (trimmed.startsWith('#') || trimmed.startsWith('#KODIPROP:')) {
      // Komentar atau metadata DRM, lewati
    } else {
      currentUrl = trimmed;
      if (currentUrl) {
        channels.push({
          name: currentName || 'Unnamed',
          group: currentGroup || '',
          logo: currentLogo || '',
          url: currentUrl,
        });
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
  const [activeTab, setActiveTab] = useState('player');
  const [channels, setChannels] = useState(() => {
    try {
      const saved = localStorage.getItem('gravity_channels');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentChannel, setCurrentChannel] = useState(null);

  // Simpan ke localStorage
  useEffect(() => {
    localStorage.setItem('gravity_channels', JSON.stringify(channels));
  }, [channels]);

  // ========== STATE FORM SINGLE STREAM ==========
  const [formName, setFormName] = useState('');
  const [formGroup, setFormGroup] = useState('');
  const [formLogo, setFormLogo] = useState('');
  const [formUrl, setFormUrl] = useState('');

  // ========== STATE IMPORT M3U ==========
  const [showM3UModal, setShowM3UModal] = useState(false);
  const [m3uContent, setM3uContent] = useState('');
  const fileInputRef = useRef(null);

  // Tambah satu channel
  const addChannel = (channel) => {
    setChannels(prev => [...prev, channel]);
    if (!currentChannel) setCurrentChannel(channel);
    setFormName('');
    setFormGroup('');
    setFormLogo('');
    setFormUrl('');
  };

  // Hapus channel
  const removeChannel = (index) => {
    const newChannels = channels.filter((_, i) => i !== index);
    setChannels(newChannels);
    if (currentChannel && index === channels.indexOf(currentChannel)) {
      setCurrentChannel(newChannels.length > 0 ? newChannels[0] : null);
    }
  };

  // Submit single stream
  const handleAddSingle = (e) => {
    e.preventDefault();
    if (!formUrl.trim()) return;
    addChannel({
      name: formName.trim() || 'Unnamed',
      group: formGroup.trim(),
      logo: formLogo.trim(),
      url: formUrl.trim(),
    });
  };

  // Baca file M3U dari HP
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setM3uContent(ev.target.result);
    };
    reader.readAsText(file);
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

  // ========== PLAYER ==========
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (activeTab !== 'player' || !currentChannel) return;

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
  }, [activeTab, currentChannel]);

  const switchChannel = (channel) => {
    setCurrentChannel(channel);
  };

  const clearAll = () => {
    if (window.confirm('Hapus semua channel?')) {
      setChannels([]);
      setCurrentChannel(null);
    }
  };

  return (
    <div className="app-container">
      {/* ====== HEADER ====== */}
      <div className="mobile-nav" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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

      {/* ====== KONTEN ====== */}
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

          {/* Tombol Import M3U */}
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

          {/* ===== MODAL IMPORT M3U ===== */}
          {showM3UModal && (
            <div className="modal-overlay" onClick={() => setShowM3UModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Load M3U File</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '0.8rem' }}>
                  or paste content below
                </p>

                {/* Tombol Load File */}
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', marginBottom: 16 }}
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

                {/* Textarea untuk paste konten */}
                <textarea
                  placeholder={`#EXTM3U\n#EXTINF:-1 tvg-name="Channel" group-title="Group",Channel Name\nhttps://stream.url`}
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
                  <path d="M8 5v14l11-7z" />
                </svg>
                <p>Select a channel from the list</p>
              </div>
            )}
          </main>
        </>
      )}

      {/* Mobile Tab Bar */}
      <div className="mobile-tab-bar">
        <button className={activeTab === 'library' ? 'active' : ''} onClick={() => setActiveTab('library')}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h2v2H4V6zm4 0h12v2H8V6zM4 11h2v2H4v-2zm4 0h12v2H8v-2zM4 16h2v2H4v-2zm4 0h12v2H8v-2z" /></svg>
          Library
        </button>
        <button className={activeTab === 'player' ? 'active' : ''} onClick={() => setActiveTab('player')}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          Player
        </button>
      </div>
    </div>
  );
}

export default App;