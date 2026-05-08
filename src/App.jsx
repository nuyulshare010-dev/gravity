import { useEffect, useRef, useState } from 'react';
import shaka from 'shaka-player';
import 'shaka-player/dist/controls.css';

// Daftar channel contoh — ganti dengan URL streaming kamu sendiri
const channels = [
  { name: 'True Sports', url: 'https://example.com/stream1.mpd' },
  { name: 'True Sports 2', url: 'https://example.com/stream2.mpd' },
  { name: 'ON Sports HD', url: 'https://example.com/stream3.mpd' },
  { name: 'ON Sports+ HD', url: 'https://example.com/stream4.mpd' },
  { name: 'Okey', url: 'https://example.com/stream5.mpd' },
  { name: 'True Sports 7', url: 'https://example.com/stream6.mpd' },
];

function App() {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [currentChannel, setCurrentChannel] = useState(channels[0]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Inisialisasi Shaka Player
  useEffect(() => {
    shaka.polyfill.installAll();

    const video = videoRef.current;
    const player = new shaka.Player(video);
    playerRef.current = player;

    player.addEventListener('error', (event) => {
      console.error('Shaka error', event.detail);
    });

    // Muat channel pertama
    player.load(currentChannel.url).catch(console.error);

    return () => {
      player.destroy();
    };
  }, []);

  // Ganti channel
  const switchChannel = (channel) => {
    setCurrentChannel(channel);
    if (playerRef.current) {
      playerRef.current.load(channel.url).catch(console.error);
    }
    // Tutup drawer setelah pilih channel (mobile)
    setSidebarOpen(false);
  };

  return (
    <div className="app-container">
      {/* ====== MOBILE NAVIGATION ====== */}
      <div className="mobile-nav">
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1>Gravity IPTV</h1>
      </div>

      {/* ====== DRAWER OVERLAY (MOBILE) ====== */}
      <div
        className={`drawer-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ====== SIDEBAR (CHANNELS) ====== */}
      <aside className={`sidebar ${sidebarOpen ? 'drawer-open' : ''}`}>
        <h2 style={{ marginBottom: 16 }}>Channels</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {channels.map((ch, i) => {
            const isActive = ch.name === currentChannel.name;
            return (
              <button
                key={i}
                className="btn btn-ghost"
                onClick={() => switchChannel(ch)}
                style={{
                  justifyContent: 'flex-start',
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? 'var(--accent-glow)' : 'transparent',
                  color: isActive ? 'var(--accent-light)' : 'var(--text-secondary)',
                  textAlign: 'left',
                }}
              >
                {ch.name}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ====== PLAYER AREA ====== */}
      <main className="player-area">
        <div className="video-container">
          <video
            ref={videoRef}
            style={{ width: '100%', height: '100%', background: '#000' }}
            controls
            autoPlay
          />
        </div>

        {/* Badge channel aktif */}
        <div
          className="badge"
          style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}
        >
          {currentChannel.name}
        </div>
      </main>

      {/* ====== MOBILE TAB BAR ====== */}
      <div className="mobile-tab-bar">
        <button className="active">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" />
          </svg>
          Live
        </button>
        <button onClick={() => setSidebarOpen(true)}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 6h16v2H4V6zm0 6h16v2H4v-2zm0 6h16v2H4v-2z" />
          </svg>
          Channels
        </button>
        <button>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z" />
          </svg>
          Library
        </button>
      </div>
    </div>
  );
}

export default App;