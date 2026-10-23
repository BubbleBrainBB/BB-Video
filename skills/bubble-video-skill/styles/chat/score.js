// Music (starting point for the chat-log style): light, everyday — plucks and electric piano, soft drums, leaving room for the "ding" of messages. How to write it: references/music.md.
// With narration, drums and melody drop out automatically while the voice speaks (only the bed stays). For a story set in ancient China, switch to a pentatonic scale (e.g. D major pentatonic, plucks like a guzheng).
export default {
  name: '一句话：这段音乐要让人感觉到什么（例：深夜一个群聊，一条条消息冒出来）',
  key: 'F major',
  human: 0.6,
  space: { size: 0.35, damp: 0.5, mix: 0.25 },
  chords: { 1: ['Fmaj7', 'Dm7', 'Bbmaj7', 'C'], 2: ['Fmaj7', 'Am7', 'Bbmaj7', 'C'], 3: ['Dm7', 'Bbmaj7', 'F', 'C'] },
  motif: 'A5:.5 C6:.5 A5:.5 G5:.5 F5:1 G5:1 | A5:.5 G5:.5 F5:.5 D5:.5 C5:2',
  parts: [
    { name: '电钢琴铺底', synth: 'epiano', play: 'chord', pattern: 'x-------', octave: 4, gain: 0.08, underVoice: 'keep', from: 0 },
    { name: '拨弦', synth: 'pluck', play: 'arp', pattern: { 0: 'x...x...', 1: 'x.x.x.x.', 3: 'xxx.xxx.' }, octave: 5, gain: 0.07, from: 0 },
    { name: '低音', synth: 'sub', play: 'bass', pattern: { 1: 'x.......', 2: 'x...x...' }, octave: 2, gain: 0.14, from: 1 },
    { name: '鼓', synth: 'kick', pattern: { 2: 'x.......x.......', 3: 'x...x...x...x...' }, gain: 0.14, from: 2 },
    { name: '拍手', synth: 'clap', pattern: { 2: '....x.......x...', 3: '....x.......x...' }, gain: 0.08, from: 2 },
    { name: '沙锤', synth: 'shaker', pattern: { 2: 'x.x.x.x.x.x.x.x.', 3: 'xxxxxxxxxxxxxxxx' }, gain: 0.06, from: 2 },
    { name: '旋律', synth: 'bell', play: 'motif', gain: 0.06, from: 2 },
  ],
};
