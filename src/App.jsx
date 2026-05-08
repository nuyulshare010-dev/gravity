import { useEffect, useRef, useState } from 'react';
import shaka from 'shaka-player/dist/shaka-player.ui';
import 'shaka-player/dist/controls.css';

// Daftar channel contoh (bisa diganti sumber Anda)
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

  useEffect(() => {
    shaka.polyfill.installAll();

    const video = videoRef.current;
    const player = new shaka.Player(video);
    playerRef.current = player;

    // Error handling
    player.addEventListener('error', (event) => {
      console.error('Shaka error', event.detail);
    });

    // Load channel pertama
    player.load(currentChannel.url).catch(console.error);

    return () => {
      player.destroy();
    };
  }, []);

  const handleChannelClick = (channel) => {
    setCurrentChannel(channel);
    if (playerRef.current) {
      playerRef.current.load(channel.url).catch(console.error);
    }
  };

  return (
    <div className="iptv-container">
      {/* Daftar channel di kiri */}
      <div className="channel-list">
        <h2 style={{ color: 'white', padding: '10px', margin: 0 }}>CHANNELS</h2>
        {channels.map((ch, i) => (
          <div
            key={i}
            className={`channel-item ${ch.name === currentChannel.name ? 'active' : ''}`}
            onClick={() => handleChannelClick(ch)}
          >
            {ch.name}
          </div>
        ))}
      </div>

      {/* Pemutar video di kanan */}
      <div className="player-area">
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', background: 'black' }}
          controls
          autoPlay
        />
        {/* Nama channel yang sedang diputar */}
        <div className="now-playing">{currentChannel.name}</div>
      </div>
    </div>
  );
}

export default App;
