// Sound design (starting point for the chat-log style): the sounds of a phone — the "pop" of a message arriving, the "whoosh" of one sent, soft key taps, a two-note notification, the swipe of switching chats. Principles and how to write it: the skill's references/sound.md.
// Types the components emit: receive, send, type (typing), notify (notification), system (system notice), voice (a voice message starts playing), react (an emoji reaction),
//   tick (one more line in a sign-up chain), swipe (switch to another chat / transition), zoom (push in on a message), logo. Pitched sounds are in F major — change to match the score.
export default {
  name: 'One line: what this product / topic sounds like (e.g. a lively group chat, one message after another)',
  space: { size: 0.2, mix: 0.08 },
  vary: 0.05,
  sounds: {
    receive: { variants: [{ use: 'drop', freq: 'A5', gain: 0.6 }, { use: 'drop', freq: 'C6', gain: 0.6 }, { use: 'drop', freq: 'F5', gain: 0.6 }] },
    send: { use: 'swish', color: 'air', from: 900, to: 3200, dur: 0.18, gain: 0.5 },
    type: { use: 'key', bright: 2400, gain: 0.5 },
    notify: { layers: [{ use: 'glass', note: 'C6', dur: 0.35, decay: 9, gain: 0.5 }, { use: 'glass', note: 'F6', dur: 0.5, decay: 7, gain: 0.45, delay: 0.12 }] },
    system: { use: 'tick', freq: 2600, gain: 0.4 },
    voice: { use: 'blip', freq: 'F5', to: 'C6', dur: 0.08, gain: 0.35 },
    react: { use: 'pop', freq: 700, rise: 900, gain: 0.5 },
    tick: { use: 'tick', freq: 3000, gain: 0.45 },
    swipe: { use: 'swish', color: 'cloth', from: 500, to: 2600, dur: 0.35, gain: 0.5 },
    zoom: { use: 'swish', color: 'air', from: 300, to: 1500, dur: 0.35, gain: 0.35 },
    impact: { layers: [{ use: 'thud', freq: 70, decay: 10, gain: 0.7 }, { use: 'glass', note: 'F5', dur: 0.4, decay: 8, gain: 0.3 }] },
    whoosh: { use: 'swish', color: 'cloth', from: 500, to: 2600, dur: 0.35 },
    click: { use: 'click', freq: 1800, noise: 0.3 },
    pop: { use: 'drop', freq: 'C6' },
    riser: { use: 'swell', of: 'glass', dur: 1.0 },
    boom: { layers: [{ use: 'thud', freq: 50, decay: 6 }, { use: 'glass', note: 'F4', dur: 1.2, decay: 3, gain: 0.3 }] },
  },
  hit: 'impact',
  rise: null,
  logo: [{ use: 'drop', freq: 'F5', gain: 0.6 }, { use: 'drop', freq: 'A5', gain: 0.6, delay: 0.1 }, { use: 'glass', note: 'C6', dur: 1.2, decay: 3, gain: 0.45, delay: 0.2 }],
};
