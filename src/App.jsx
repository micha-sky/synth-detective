import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

const EXAMPLES = [
  { artist: 'Laurent Garnier', track: 'The Man With The Red Face' },
  { artist: 'Aphex Twin', track: 'Windowlicker' },
  { artist: 'Boards of Canada', track: 'Roygbiv' },
  { artist: 'Daft Punk', track: 'Da Funk' },
]

function parseYouTubeTitle(url) {
  // returns null if not a youtube URL — title extraction happens server-side via search
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      return true
    }
  } catch {}
  return false
}

export default function App() {
  const [artist, setArtist] = useState('')
  const [track, setTrack] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])

  const isYouTube = parseYouTubeTitle(track)

  const identify = async (overrideArtist, overrideTrack) => {
    const a = overrideArtist ?? artist
    const t = overrideTrack ?? track
    if (!t.trim()) return

    setLoading(true)
    setResult('')
    setError('')

    try {
      const res = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist: a.trim(), track: t.trim() })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data.result)
      setHistory(h => [{ artist: a, track: t, result: data.result }, ...h].slice(0, 10))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const loadFromHistory = (item) => {
    setArtist(item.artist)
    setTrack(item.track)
    setResult(item.result)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0e0e0e',
      color: '#e8e4dc',
      fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
      padding: '2rem 1rem'
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 6px', color: '#fff' }}>
            synth detective
          </h1>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
            identify the hardware behind a track — searches equipboard, sound on sound, gearspace &amp; more
          </p>
        </div>

        {/* input area */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>artist</label>
              <input
                value={artist}
                onChange={e => setArtist(e.target.value)}
                placeholder="Laurent Garnier"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>
                track name {isYouTube && <span style={{ color: '#f0a500' }}>— paste YouTube URL and we'll search by title</span>}
              </label>
              <input
                value={track}
                onChange={e => setTrack(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && identify()}
                placeholder="The Man With The Red Face"
                style={inputStyle}
              />
            </div>
          </div>
          <button
            onClick={() => identify()}
            disabled={loading || !track.trim()}
            style={btnStyle(loading || !track.trim())}
          >
            {loading ? 'searching...' : 'identify gear →'}
          </button>
        </div>

        {/* example tracks */}
        <div style={{ marginBottom: '2rem' }}>
          <span style={{ fontSize: 11, color: '#555', marginRight: 10 }}>try:</span>
          {EXAMPLES.map(ex => (
            <button
              key={ex.track}
              onClick={() => { setArtist(ex.artist); setTrack(ex.track); identify(ex.artist, ex.track) }}
              disabled={loading}
              style={{
                background: 'none', border: 'none', color: '#666',
                fontSize: 12, cursor: 'pointer', marginRight: 14,
                padding: 0, textDecoration: 'underline', textDecorationStyle: 'dotted'
              }}
            >
              {ex.artist} — {ex.track}
            </button>
          ))}
        </div>

        {/* loading state */}
        {loading && (
          <div style={{ color: '#666', fontSize: 13, marginBottom: '1.5rem' }}>
            <span style={{ animation: 'pulse 1.5s infinite' }}>searching equipboard, sound on sound, gearspace...</span>
          </div>
        )}

        {/* error */}
        {error && (
          <div style={{ color: '#c0392b', fontSize: 13, padding: '10px 14px', border: '1px solid #3d1a1a', borderRadius: 4, marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {/* result */}
        {result && (
          <div style={{
            background: '#161616',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            padding: '1.5rem',
            fontSize: 14,
            lineHeight: 1.75
          }}>
            <ReactMarkdown
              components={{
                h2: ({children}) => <h2 style={{ fontSize: 17, fontWeight: 500, color: '#fff', margin: '0 0 1rem', borderBottom: '1px solid #2a2a2a', paddingBottom: '0.5rem' }}>{children}</h2>,
                h3: ({children}) => <h3 style={{ fontSize: 13, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '1.5rem 0 0.5rem' }}>{children}</h3>,
                li: ({children}) => <li style={{ marginBottom: 6, color: '#c8c4bc' }}>{children}</li>,
                strong: ({children}) => <strong style={{ color: '#fff', fontWeight: 500 }}>{children}</strong>,
                em: ({children}) => <em style={{ color: '#888', fontStyle: 'normal', fontSize: 12 }}>{children}</em>,
                p: ({children}) => <p style={{ color: '#c8c4bc', margin: '0 0 0.75rem' }}>{children}</p>,
                hr: () => <hr style={{ border: 'none', borderTop: '1px solid #2a2a2a', margin: '1rem 0' }} />,
                a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#7a9ccc', textDecoration: 'none' }}>{children}</a>,
              }}
            >
              {result}
            </ReactMarkdown>
          </div>
        )}

        {/* history */}
        {history.length > 1 && (
          <div style={{ marginTop: '2rem' }}>
            <p style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>recent searches</p>
            {history.slice(1).map((item, i) => (
              <button
                key={i}
                onClick={() => loadFromHistory(item)}
                style={{
                  display: 'block', background: 'none', border: 'none',
                  color: '#555', fontSize: 12, cursor: 'pointer',
                  padding: '3px 0', textAlign: 'left'
                }}
              >
                {item.artist} — {item.track}
              </button>
            ))}
          </div>
        )}

      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #0e0e0e; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        ul { padding-left: 1.2rem; margin: 0.25rem 0 0.75rem; }
      `}</style>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  background: '#161616',
  border: '1px solid #2a2a2a',
  borderRadius: 4,
  color: '#e8e4dc',
  fontFamily: 'inherit',
  fontSize: 13,
  padding: '9px 12px',
  outline: 'none'
}

const btnStyle = (disabled) => ({
  background: disabled ? '#1a1a1a' : '#e8e4dc',
  color: disabled ? '#444' : '#0e0e0e',
  border: 'none',
  borderRadius: 4,
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 500,
  padding: '9px 18px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.15s'
})
