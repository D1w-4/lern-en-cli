import { stashTransport } from 'src/api/stash';
import { chunkPromise } from 'src/utils';

export interface IStyleUse {
    totalFiles: number,
    totalRows: number
}

export class CheckStyleUse {
    fetchListServices(): Promise<Array<string>> {
        return stashTransport.fetchListRepo('T15').then((result) => {
            return result.map(({ name }) => name)
        })
    }

    private fetchRepoFiles(repoName: string, branch: string): Promise<Array<string>> {
        return stashTransport.fetchRepoFiles('T15', repoName, branch)
    }

    async checkStyleUse(repoName: string, branch: string): Promise<IStyleUse> {
        let result = await stashTransport.fetchCommits('T15', repoName, branch);

        let fileList = await this.fetchRepoFiles(repoName, branch);
        fileList = fileList.filter(path => {
            const ext = path.split('.').pop();
            return ['styl', 'css', 'scss'].includes(ext);
        });

        const prList = fileList.map(path => {
            return () => {
                return stashTransport.fetchRawFile('T15', repoName, path, branch)
            };
        });
        const cssStrSize = await chunkPromise(prList, 10);
        const totalRows = cssStrSize.map((file) => {
            return file.split(/\n/).filter(s => !!s.trim())
        }).reduce((acc, value) => [...acc, ...value],[]).length;

        return {
            totalFiles: fileList.length,
            totalRows
        };
    }
}

export const checkStyleUse = new CheckStyleUse();
