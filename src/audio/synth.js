/**
 * synth.js — Audio synthesis layer using Tone.js
 */

const AudioEngine = (() => {

  let _synth       = null;
  let _chordSynth  = null;
  let _errorSynth  = null;
  let _initialised = false;
  let _muted       = false;
  let _volume      = -10;

  const NOTE_SCALE = [
    "C4","D4","E4","F4","G4","A4","B4",
    "C5","D5","E5","F5","G5",
  ];

  async function init() {
    if (_initialised) return;
    try {
      await Tone.start();
      _synth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope:   { attack: 0.02, decay: 0.15, sustain: 0.1, release: 0.4 },
        volume:     _volume,
      }).toDestination();

      _chordSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope:   { attack: 0.05, decay: 0.6, sustain: 0.3, release: 1.2 },
        volume:     _volume - 4,
      }).toDestination();

      _errorSynth = new Tone.Synth({
        oscillator: { type: "sawtooth" },
        envelope:   { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 },
        volume:     _volume - 2,
      }).toDestination();

      _initialised = true;
    } catch (e) {
      console.warn("AudioEngine: failed to initialise Tone.js", e);
    }
  }

  function playNote(note) {
    if (!_synth || !_initialised || _muted) return;
    if (!NOTE_SCALE.includes(note)) return;
    try { _synth.triggerAttackRelease(note, "8n"); } catch (e) { console.warn("playNote:", e); }
  }

  function playHaltChord() {
    if (!_chordSynth || !_initialised || _muted) return;
    try { _chordSynth.triggerAttackRelease(["C4","E4","G4","C5"], "2n"); } catch (e) {}
  }

  function playErrorTone() {
    if (!_errorSynth || !_initialised || _muted) return;
    try {
      _errorSynth.triggerAttackRelease("A2", "16n");
      setTimeout(() => { try { _errorSynth.triggerAttackRelease("F2", "8n"); } catch(e){} }, 120);
    } catch (e) {}
  }

  async function replaySequence(notes, intervalMs = 250) {
    if (!_synth || !_initialised || _muted) return;
    for (const note of notes) {
      playNote(note);
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }

  function setVolume(db) {
    _volume = db;
    if (_synth)      _synth.volume.value      = db;
    if (_chordSynth) _chordSynth.volume.value = db - 4;
    if (_errorSynth) _errorSynth.volume.value = db - 2;
  }

  function setMuted(val) { _muted = val; }
  function isMuted() { return _muted; }
  function getNoteScale() { return NOTE_SCALE; }
  function noteIndex(note) { return NOTE_SCALE.indexOf(note); }

  return { init, playNote, playHaltChord, playErrorTone, replaySequence, setVolume, setMuted, isMuted, getNoteScale, noteIndex };

})();
