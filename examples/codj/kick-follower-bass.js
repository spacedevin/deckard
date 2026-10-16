// A sub bass that locks to whatever kick is in the room: it reads the kick's step pattern every bar and answers
// the gaps (bass between kicks, the classic sidechain-free pocket), walking a root → fifth → octave line per phrase.

const ROOT = 36 // C2 — change the key here
const LINE = [0, 0, 7, 12]

function findKick(codj) {
  return codj.tracks().find((t) => !t.mine && /kick|bd|drum/i.test(t.name + ' ' + t.gen))
}

export function setup(codj) {
  codj.state.bass = codj.owned()[0] || codj.addTrack({ name: 'Sub', gen: 'sub808', gain: 0.8 }).id
}

export function onBar(codj, ctx) {
  const kick = findKick(codj)
  const hits = kick ? kick.steps : 'x...x...x...x...'
  const offset = LINE[Math.floor(ctx.bar / 4) % LINE.length]
  const notes = []
  for (let i = 0; i < 16; i++) {
    if (hits[i] !== 'x' && hits[(i + 15) % 16] === 'x') {
      notes.push({ pitch: ROOT + offset, start: i * 0.25, dur: 0.25, vel: 100 })
    }
  }
  const key = JSON.stringify(notes)
  if (key !== codj.state.lastNotes) {
    codj.setNotes(codj.state.bass, notes)
    codj.state.lastNotes = key
  }
}
