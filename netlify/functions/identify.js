export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const { track, artist } = body

  if (!track) {
    return new Response(JSON.stringify({ error: 'track is required' }), { status: 400 })
  }

  if (typeof track !== 'string' || track.length > 300 || (artist && (typeof artist !== 'string' || artist.length > 200))) {
    return new Response(JSON.stringify({ error: 'artist/track too long' }), { status: 400 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Server is missing OPENAI_API_KEY — set it in .env (local) or `netlify env:set OPENAI_API_KEY <key>` (deployed)' }),
      { status: 500 }
    )
  }

  const prompt = `You are a music gear researcher specialising in electronic music production.

The user wants to know what synthesizers, drum machines, samplers, effects units, and other hardware or software were used to produce this track:

Track: "${track}"
Artist: "${artist || 'unknown'}"

Search these sources in this order — be thorough, run multiple searches:
1. Equipboard.com — search for the artist's page and any track-specific gear entries
2. Sound on Sound magazine — artist interviews, "in the studio" features, technique articles
3. Gearspace (formerly Gearslutz) — threads about this track or artist's studio setup
4. Reddit — r/synthesizers, r/edmproduction, r/WeAreTheMusicMakers, r/wearethemusicmakers
5. YouTube — "how I made" videos, studio tour videos, Fact Magazine interviews, Red Bull Music Academy lectures
6. Music technology press — Future Music, MusicTech, Attack Magazine, RA (Resident Advisor) features
7. Discogs — release credits, liner notes
8. Any official artist interviews mentioning studio gear

After researching, return your findings in this exact format:

---

## [Track name] — [Artist name]

### Confirmed gear
List only instruments/gear cited in a named source. For each item write:
- **[Instrument name]** — [what it does on the track, e.g. "Reese bass line"] — *Source: [publication/site name]*

### Likely gear
Based on the artist's documented setup, the era, the production scene (Detroit techno / Chicago house / Berlin techno / etc.), and what you hear described. For each item:
- **[Instrument name]** — [reasoning, e.g. "standard in French house productions of this period; Garnier has confirmed owning one"]

### Synthesis types identified
A brief list: e.g. FM synthesis (digital), subtractive analog, sample-based drums, hardware sequencer.

### What couldn't be found
Be honest. If the track is obscure or undocumented, say so. Do not invent citations.

### Sources checked
List the actual URLs or publication names you searched.

---

Prioritise specificity: "Roland Juno-106" is better than "Roland synthesizer". "Yamaha DX7" is better than "FM synthesizer". Include drum machines and samplers, not just melodic synths. Note if something is a software emulation vs original hardware where that distinction is documented.`

  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-5.1',
        max_output_tokens: 4096,
        tools: [{ type: 'web_search' }],
        input: prompt,
        stream: true
      })
    })

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({ message: upstream.statusText }))
      const msg = err?.error?.message || err?.message || upstream.statusText
      // pass auth/rate-limit statuses through so the client can tell them apart
      const status = upstream.status === 401 || upstream.status === 429 ? upstream.status : 500
      return new Response(JSON.stringify({ error: msg }), { status })
    }

    // Re-stream: parse OpenAI's SSE events and forward only the answer text,
    // so the browser receives plain markdown as it's generated
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body.getReader()
        let buf = ''
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            const lines = buf.split('\n')
            buf = lines.pop()
            for (const line of lines) {
              if (!line.startsWith('data:')) continue
              const payload = line.slice(5).trim()
              if (!payload || payload === '[DONE]') continue
              try {
                const evt = JSON.parse(payload)
                if (evt.type === 'response.output_text.delta' && evt.delta) {
                  controller.enqueue(encoder.encode(evt.delta))
                } else if (evt.type === 'response.failed') {
                  controller.enqueue(encoder.encode(`\n\n**Error:** ${evt.response?.error?.message || 'generation failed'}`))
                }
              } catch { /* ignore malformed SSE lines */ }
            }
          }
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export const config = { path: '/api/identify' }
