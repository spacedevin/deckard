# Default Deckard demo — edit or swap this file and load via loadProjectFromTpl(text) in the shell.
tpl 1
bpm 118

track Kick id c0 gen noise_burst
  mix gain 0.85 pan 0 eq_lo 0 eq_mid 0 eq_hi 0
  step_pitch 36
  noise attack 0.002 decay 0.12 tone 0.15 pitch_follow 0.35
  steps x . . . x . . . x . . . x . . .

track Snare id c1 gen noise_burst
  mix gain 0.85 pan 0 eq_lo 0 eq_mid 0 eq_hi 0
  step_pitch 38
  noise attack 0.002 decay 0.09 tone 0.55 pitch_follow 0.2
  steps . . . . x . . . . . . . x . . .

track HiHat id c2 gen noise_burst
  mix gain 0.85 pan 0 eq_lo 0 eq_mid 0 eq_hi 0
  step_pitch 42
  noise attack 0.001 decay 0.035 tone 0.85 pitch_follow 0.05
  steps x . x . x . x . x . x . x . x .

track Bass id c3 gen fm
  mix gain 0.85 pan 0 eq_lo 0 eq_mid 0 eq_hi 0
  step_pitch 48
  fm ratio 1 mod_index 6 carrier sine mod sine
  adsr a 0.008 d 0.12 s 0.35 r 0.15
  note 48 0 0.5 v 90
  note 50 1 0.5 v 85
  note 52 2 0.5 v 88
  note 53 3 0.5 v 80

master_mix eq_lo 0 eq_mid 0 eq_hi 0

actor_mix local gain 1 eq_lo 0 eq_mid 0 eq_hi 0

auto master_gain
  0 1
  16 1
