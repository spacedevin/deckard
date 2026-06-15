#!/usr/bin/env bash
# Anti-spaghetti ratchet (Plan step 7, run early as a guard).
#
# THE LAW: the UI layer (src/ui) is a pure TPL client — it may READ the project to render, but it must
# NEVER mutate document/model state or audio nodes directly. Every edit goes through ingest/emit.
#
# This script counts the UI's remaining direct-write sites. The number must only ever DECREASE toward 0.
# If it goes UP, a change reintroduced the tangle — the build fails. Lower BASELINE as controls migrate.
set -u
cd "$(dirname "$0")/.."
UI=src/ui

# (1) Direct assignment to a project field:  project.foo = ...
proj=$(grep -rnE '\bproject\.[a-zA-Z]+ *=[^=]' $UI | grep -v '==' | wc -l | tr -d ' ')
# (2) Model mutator helpers called from the UI (they mutate channel/session objects in place).
mut=$(grep -rnE 'setChannel(Gain|Pan|Eq|Mute|Solo)\(|toggleStep\(|clearStep\(|setStepVel\(|addPianoNote\(|removePianoNoteAt\(|promoteChannelToBars\(|setGeneratorAdsr\(' $UI | wc -l | tr -d ' ')
# (3) Direct model-field writes:  ch.gain = / a.eqLo = / ch.generatorParams.x = ...
field=$(grep -rnE '\.(generatorParams\.[a-zA-Z]+|gain|pan|mute|solo|eqLo|eqMid|eqHi|reverbSend|drive|filterCutoff|filterQ|lfoRate|lfoDepth|octave|arp|chord) *=[^=]' $UI | grep -v '==' | wc -l | tr -d ' ')
# (4) Audio-node mutation from the UI (must be ZERO — audio is the Audio projection's job).
audio=$(grep -rnE '\.gain\.value *=|\.connect\(|\.disconnect\(' $UI | wc -l | tr -d ' ')

total=$((proj + mut + field + audio))

# Baseline snapshot — NEVER raise it; drive it to 0 as controls migrate onto rt.emit/ingest.
# History: 40 (guard introduced) -> 27 (deleted dead Mixer.tish/ChannelRack.tish) -> 20 (InstrumentEditor).
# Remaining: InstrumentPanel/GeneratorParams/MatrixFmPanel (duplicate instrument UI to reconcile),
# DeckMixer deck-EQ macro, CoDjPanel roster, + step/piano/session edits coupled to the step-6 rack model.
BASELINE=20

echo "ratchet: project=$proj model-mutators=$mut model-fields=$field audio=$audio  => total=$total (baseline $BASELINE, target 0)"

if [ "$audio" -gt 0 ]; then
  echo "RATCHET FAIL: the UI mutates audio nodes directly (must be 0)."
  grep -rnE '\.gain\.value *=|\.connect\(|\.disconnect\(' $UI
  exit 1
fi
if [ "$total" -gt "$BASELINE" ]; then
  echo "RATCHET FAIL: UI direct-writes ($total) exceed baseline ($BASELINE) — a change reintroduced direct mutation. Route it through rt.emit/ingest."
  exit 1
fi
echo "ratchet OK (<= baseline)"
