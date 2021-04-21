// // const audio = require('audio-loader');
// // const play = require('audio-play');
// // const args = process.argv;
// // function playAudioFromBuffer(fileContents) {
// //   play(fileContents);
// // }
// // function start() {
// //   const arg = args.pop();
// //   if (arg === '--') {
// //     return;
// //   }
// //   audio(arg).then((data) => {
// //     playAudioFromBuffer(data);
// //   }, start)
// // }
// // start()
// const http = require('http'); // or 'https' for https:// URLs
// const fs = require('fs');
// const os = require('os');
// const path = require('path');
// const playSound = require('play-sound')(opts = {});
//
// const filePath = 'http://s3.amazonaws.com/audio.vocabulary.com/1.0/us/0/1EVGJ365S0NYJ.mp3';
//
//
// function play(filePath) {
//   const tempPath = path.join(os.tmpdir(), 'lear-cli')
//   if (!fs.existsSync(tempPath)) {
//     fs.mkdirSync(tempPath);
//   }
//   const fileName = filePath.split('/').pop();
//
//   http.get(filePath, function(response) {
//     const tempFilePath = path.resolve(tempPath, fileName);
//     const file = fs.createWriteStream(tempFilePath);
//     response.pipe(file).on('close', () => {
//       playSound.play(tempFilePath, () => {
//           console.log('end2');
//       })
//       console.log('end1');
//     });
//   });
//
// }
// play(filePath);
