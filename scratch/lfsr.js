function generateNesLfsr(mode) {
  let reg = 1;
  let out = [];
  let steps = mode === 15 ? 32767 : 93;
  for (let i = 0; i < steps; i++) {
    let bit0 = reg & 1;
    let bitOther = mode === 15 ? ((reg >> 1) & 1) : ((reg >> 6) & 1);
    let feedback = bit0 ^ bitOther;
    reg = (reg >> 1) | (feedback << 14);
    out.push((reg & 1) === 0 ? 1 : -1);
  }
  return out;
}
console.log("15-bit length:", generateNesLfsr(15).length);
console.log("9-bit length:", generateNesLfsr(9).length);
