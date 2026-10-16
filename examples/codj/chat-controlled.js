// A co-DJ the room can steer from chat: "@Name more", "@Name less", "@Name drop", "@Name back".
// Shows onMessage + persistent state + replying with codj.say.

const LEVELS = ['x.......x.......', 'x...x...x...x...', 'x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxxxxxx']

export function setup(codj) {
  codj.state.level = codj.state.level ?? 1
  codj.state.perc = codj.owned()[0] || codj.addTrack({ name: 'Perc', gen: 'clap', gain: 0.5, steps: LEVELS[1] }).id
}

export function onMessage(codj, ctx) {
  const m = ctx.message
  if (!m.toMe) return
  const text = m.text.toLowerCase()
  if (text.includes('more')) codj.state.level = Math.min(LEVELS.length - 1, codj.state.level + 1)
  else if (text.includes('less')) codj.state.level = Math.max(0, codj.state.level - 1)
  else if (text.includes('drop')) codj.state.muted = true
  else if (text.includes('back')) codj.state.muted = false
  else return codj.say('I understand more / less / drop / back', m.from)
  codj.say(codj.state.muted ? 'dropping out' : 'density ' + codj.state.level, m.from)
}

export function onBar(codj) {
  const want = LEVELS[codj.state.level] + (codj.state.muted ? ' muted' : '')
  if (want === codj.state.applied) return
  codj.setSteps(codj.state.perc, LEVELS[codj.state.level])
  codj.mix(codj.state.perc, { mute: !!codj.state.muted })
  codj.state.applied = want
}
