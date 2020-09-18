import * as fs from 'fs';
import * as path from 'path';

type TResult = Array<string>;
export function getFileList(
  filePath: string, extsFilter: Array<string>
): Promise<TResult> {
  return new Promise<TResult>((resolveStat, errorStat) => {
    fs.stat(filePath, (err, stat) => {
      if (err) {
        errorStat(err);
        return;
      }
      if (stat.isDirectory()) {
        const prDir = new Promise<TResult>((resolveDir, rejectDir) => {
          fs.readdir(filePath, (error, fileList) => {
            if (error) {
              rejectDir(error);
            } else {
              const prList = fileList.map(fileName => {
                const nextPath = path.resolve(filePath, fileName);
                return getFileList(nextPath, extsFilter);
              });
              resolveDir(
                Promise.all<any>(prList).then(list => list.flat(Infinity).filter(s => s)),
              );
            }
          });
        });
        resolveStat(prDir);
      } else {
        if (!extsFilter.includes(filePath.split('.').pop())) {
          resolveStat([]);
        }
        resolveStat([filePath]);
      }
    });
  });
}

