const audio = require('audio-loader');
const play = require('audio-play');
const args = process.argv;
function playAudioFromBuffer(fileContents) {
  play(fileContents);
}
function start() {
  const arg = args.pop();
  if (arg === '--') {
    return;
  }
  audio(arg).then((data) => {
    playAudioFromBuffer(data);
  }, start)
}
start()