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
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'interleaved-thinking-2025-05-14'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: err }), { status: 500 })
    }

    const data = await response.json()

    const text = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')

    return new Response(JSON.stringify({ result: text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export const config = { path: '/api/identify' }
