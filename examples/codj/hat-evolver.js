// A hat that evolves: offbeats, a busier pattern every other phrase, a fill on the last bar of every 8.
// Run: pnpm run codj -- run examples/codj/hat-evolver.js --session <id>   (edit + save to hot-reload)

const GROOVES = ['..x...x...x...x.', '..x.x.x...x.x.xx', 'x.x.x.x.x.x.x.x.']
const FILL = 'x.xxx.xxx.xxxxxx'

export function setup(codj) {
  if (!codj.owned().length) {
    codj.state.hat = codj.addTrack({ name: 'Hat', gen: 'noise_burst', steps: GROOVES[0], gain: 0.55, pan: 0.2 }).id
  } else {
    codj.state.hat = codj.owned()[0]
  }
  codj.log('hat on', codj.state.hat)
}

export function onBar(codj, ctx) {
  const phrase = Math.floor(ctx.bar / 8)
  const pattern = ctx.bar % 8 === 7 ? FILL : GROOVES[phrase % GROOVES.length]
  if (pattern !== codj.state.last) {
    codj.setSteps(codj.state.hat, pattern)
    codj.state.last = pattern
  }
}
