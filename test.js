const audio = require('audio-loader');
const play = require('audio-play');

audio(process.argv.pop()).then((data) => {
  playAudioFromBuffer(data);
})

function playAudioFromBuffer(fileContents) {
  play(fileContents);
}