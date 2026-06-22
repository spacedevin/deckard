const fs = require('fs');

const path = 'src/tpl/TplExtension.tish';
let content = fs.readFileSync(path, 'utf8');

// For string:
content = content.replace(
  /if \(stk === "mute" && sidx \+ 1 < toks.length\) {\n\s+snd.mute = Number\(toks\[sidx \+ 1\]\)\n\s+sidx = sidx \+ 2\n\s+} else {\n\s+sidx = sidx \+ 1\n\s+}/g,
  `if (stk === "mute" && sidx + 1 < toks.length) {
                snd.mute = Number(toks[sidx + 1])
                sidx = sidx + 2
              } else {
                if (stk === "gain" && sidx + 1 < toks.length) {
                  snd.gain = Number(toks[sidx + 1])
                  sidx = sidx + 2
                } else {
                  sidx = sidx + 1
                }
              }`
);

// For syncosc and osc:
// They share the same logic block shape
content = content.replace(
  /if \(isNumberToken\(tk\)\) {\n\s+nd.freqMode = "fixed"\n\s+nd.fixedHz = Number\(tk\)\n\s+idx = idx \+ 1\n\s+} else {\n\s+idx = idx \+ 1\n\s+}/g,
  `if (tk === "gain" && idx + 1 < toks.length) {
                  nd.gain = Number(toks[idx + 1])
                  idx = idx + 2
                } else {
                  if (isNumberToken(tk)) {
                    nd.freqMode = "fixed"
                    nd.fixedHz = Number(tk)
                    idx = idx + 1
                  } else {
                    idx = idx + 1
                  }
                }`
);

// For noise: (currently no loop at all! `nodes.push({ kind: "noise", id: String(toks[1]) })`)
content = content.replace(
  /if \(h === "noise" && toks.length >= 2\) {\n\s+nodes.push\(\{ kind: "noise", id: String\(toks\[1\]\) \}\)\n\s+} else {/g,
  `if (h === "noise" && toks.length >= 2) {
          let nd = { kind: "noise", id: String(toks[1]) }
          let idx = 2
          while (idx + 1 < toks.length) {
            if (toks[idx] === "gain") {
              nd.gain = Number(toks[idx + 1])
              idx = idx + 2
            } else {
              idx = idx + 1
            }
          }
          nodes.push(nd)
        } else {`
);

// For filter:
content = content.replace(
  /if \(tk === "freq"\) {\n\s+nd.freq = Number\(toks\[idx \+ 1\]\)\n\s+idx = idx \+ 2\n\s+} else {\n\s+idx = idx \+ 1\n\s+}/g,
  `if (tk === "freq") {
                  nd.freq = Number(toks[idx + 1])
                  idx = idx + 2
                } else {
                  if (tk === "gain" && idx + 1 < toks.length) {
                    nd.gain = Number(toks[idx + 1])
                    idx = idx + 2
                  } else {
                    idx = idx + 1
                  }
                }`
);

// For shaper:
content = content.replace(
  /if \(toks\[idx\] === "curve"\) {\n\s+nd.curve = String\(toks\[idx \+ 1\]\)\n\s+idx = idx \+ 2\n\s+} else {\n\s+idx = idx \+ 1\n\s+}/g,
  `if (toks[idx] === "curve") {
                    nd.curve = String(toks[idx + 1])
                    idx = idx + 2
                  } else {
                    if (toks[idx] === "gain" && idx + 1 < toks.length) {
                      nd.gain = Number(toks[idx + 1])
                      idx = idx + 2
                    } else {
                      idx = idx + 1
                    }
                  }`
);

// For pan:
content = content.replace(
  /nodes.push\(\{ kind: "pan", id: String\(toks\[1\]\), pos: pos \}\)\n\s+} else {/g,
  `let nd = { kind: "pan", id: String(toks[1]), pos: pos }
                let idx = 3
                while (idx + 1 < toks.length) {
                  if (toks[idx] === "gain") {
                    nd.gain = Number(toks[idx + 1])
                    idx = idx + 2
                  } else {
                    idx = idx + 1
                  }
                }
                nodes.push(nd)
              } else {`
);

fs.writeFileSync(path, content);
