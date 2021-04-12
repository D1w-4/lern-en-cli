import * as http from 'http';
import * as fs from 'fs';

export function fileDownload(url: string, filePath) {
  const file = fs.createWriteStream(filePath);
  return new Promise((resolve, reject) => {
    http.get(url, function(response) {
      response.pipe(file);
      file.on('finish', function() {
        file.close();
        resolve();
      });
    }).on('error', function(err) { // Handle errors
      fs.unlink(filePath, () => {});
      reject(err.message);
    });
  })
}