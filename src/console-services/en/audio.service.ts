import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
const playSound = require('play-sound')({});

class AudioService {
  private tempPath = path.join(os.tmpdir(), 'lear-cli');

  constructor() {
    if (!fs.existsSync(this.tempPath)) {
      fs.mkdirSync(this.tempPath);
    }
  }

  download(fileUrl, fileName: string): Promise<void> {
    const transport = RegExp(/^https/).test(fileUrl) ? https : http;
    return new Promise<void>((resolve, reject) => {
      transport.get(fileUrl, (response) => {
        const tempFilePath = path.resolve(this.tempPath, fileName);
        const file = fs.createWriteStream(tempFilePath);

        response.pipe(file).on('close', (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  }

  async play(fileUrl: string): Promise<void> {
    const fileName = fileUrl.split('/').pop();
    if (!fs.existsSync(path.resolve(this.tempPath, fileName))) {
      await this.download(fileUrl, fileName);
    }
    return new Promise((resolve, reject) => {
      playSound.play(path.resolve(this.tempPath, fileName), (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve()
      });

    })
  }
}

export const audioService = new AudioService();
