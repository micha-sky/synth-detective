import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

const EXAMPLES = [
  { artist: 'Laurent Garnier', track: 'The Man With The Red Face', color: 'var(--q-red)' },
  { artist: 'Aphex Twin', track: 'Windowlicker', color: 'var(--q-orange)' },
  { artist: 'Boards of Canada', track: 'Roygbiv', color: 'var(--q-yellow)' },
  { artist: 'Daft Punk', track: 'Da Funk', color: 'var(--q-cream)' },
]

function isYouTubeUrl(value) {
  try {
    const u = new URL(value)
    return u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')
  } catch {
    return false
  }
}

export default function App() {
  const [artist, setArtist] = useState('')
  const [track, setTrack] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])

  const isYouTube = isYouTubeUrl(track)

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
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || `${res.status} ${res.statusText}`)
      }
      // success responses stream plain markdown — render it as it arrives
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setResult(text)
      }
      if (!text.trim()) throw new Error('Empty response from server')
      setHistory(h => [{ artist: a, track: t, result: text }, ...h.filter(i => i.track !== t || i.artist !== a)].slice(0, 10))
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
    setError('')
  }

  return (
    <div className="unit">

      {/* faceplate header */}
      <header>
        <div className="faceplate">
          <div className="brand">
            <span className="model">SD-1</span>
            <h1>Synth Detective</h1>
          </div>
          <div className="status" role="status" aria-live="polite">
            <span className={loading ? 'led busy' : 'led'} />
            {loading ? 'BUSY' : 'READY'}
          </div>
        </div>
        <p className="tagline">
          gear identification unit — searches equipboard, sound on sound, gearspace &amp; more
        </p>
        <div className="quad-band" aria-hidden="true"><i /><i /><i /><i /></div>
      </header>

      {/* input */}
      <section className="section">
        <div className="section-label">INPUT</div>
        <div className="panel">
          <div className="field-row">
            <div className="field">
              <label htmlFor="artist">ARTIST</label>
              <input
                id="artist"
                value={artist}
                onChange={e => setArtist(e.target.value)}
                placeholder="Laurent Garnier"
              />
            </div>
            <div className="field">
              <label htmlFor="track">
                TRACK{' '}
                {isYouTube && <span className="hint">YouTube URL detected — we'll search by title</span>}
              </label>
              <input
                id="track"
                value={track}
                onChange={e => setTrack(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && identify()}
                placeholder="The Man With The Red Face"
              />
            </div>
          </div>
          <button
            className="identify-btn"
            onClick={() => identify()}
            disabled={loading || !track.trim()}
          >
            {loading ? 'SEARCHING' : 'IDENTIFY'}
          </button>
        </div>
      </section>

      {/* example patterns */}
      <section className="section">
        <div className="section-label">PATTERNS</div>
        <div className="patterns">
          {EXAMPLES.map(ex => (
            <button
              key={ex.track}
              className="pattern-btn"
              onClick={() => { setArtist(ex.artist); setTrack(ex.track); identify(ex.artist, ex.track) }}
              disabled={loading}
            >
              <span className="swatch" style={{ background: ex.color }} aria-hidden="true" />
              {ex.artist} — {ex.track}
            </button>
          ))}
        </div>
      </section>

      {/* output */}
      {(loading || error || result) && (
        <section className="section">
          <div className="section-label">OUTPUT</div>
          {loading && !result && (
            <p className="searching">scanning equipboard, sound on sound, gearspace...</p>
          )}
          {error && <div className="error-panel" role="alert">{error}</div>}
          {result && (
            <div className="panel output">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          )}
        </section>
      )}

      {/* memory */}
      {history.length > 1 && (
        <section className="section">
          <div className="section-label">MEMORY</div>
          {history.slice(1).map(item => (
            <button
              key={`${item.artist}|${item.track}`}
              className="memory-btn"
              onClick={() => loadFromHistory(item)}
            >
              {item.artist} — {item.track}
            </button>
          ))}
        </section>
      )}

    </div>
  )
}
