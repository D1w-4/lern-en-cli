import * as parser from '@babel/parser';
import { stashTransport } from 'src/api/stash';
import { chunkPromise } from 'src/utils';

export class CheckUiKitUse {
    static resolveExt: Array<string> = ['tsx', 'ts'];

    private fetchRepoFiles(repoName: string, branch: string): Promise<Array<string>> {
        return stashTransport.fetchRepoFiles('T15', repoName, branch).then(files => {
            return files.filter(path => {
                return CheckUiKitUse.resolveExt.includes(path.split('.').pop());
            })
        })
    }

    private makeAstFromString(file: string): Record<string, any> {
        return parser.parse(file, {
            sourceType: 'module',
            plugins: [
                'jsx',
                'typescript',
                'nullishCoalescingOperator',
                'classProperties',
                'optionalChaining',
                'decorators-legacy'
            ]
        })
    }

    private readFiles(pathList: Array<string>, repoName: string, branch: string): Promise<Array<string>> {
        const prList = pathList.map(path => {
            return () => {
                return stashTransport.fetchRawFile('T15', repoName, path, branch)
            };
        });
        return chunkPromise(prList, 2)
    }

    calcNormalImport(file: string): any {
        const result = {};

        this.makeAstFromString(file).program.body.filter(({ type, source }) => {
            return type === 'ImportDeclaration' && source.value.indexOf('@t15-ui-kit') !== -1 &&
                   source.value.indexOf('icons') === -1
        }).forEach((ast) => {
            const path = ast.source.value;
            result[path] = result[path] ? result[path]++ : 1
        });

        return result;
    }

    calcOldImport(file: string): Record<string, number> {
        const result = {};

        this.makeAstFromString(file).program.body.filter(({ type, source }) => {
            return type === 'ImportDeclaration' && source.value.indexOf('@tochka-modules/t15-ui-kit') !== -1 &&
                   source.value.indexOf('icons') === -1
        }).forEach((ast) => {
            const path = ast.source.value;
            result[path] = result[path] ? result[path]++ : 1
        });

        return result;
    }

    async checkUiKitUse(repoName: string, branch: string): Promise<any> {
        const files = await this.fetchRepoFiles(repoName, branch);
        const filesData = await this.readFiles(files, repoName, branch);

        const oldImport = filesData.map(fileSource => {
            return this.calcOldImport(fileSource)
        }).reduce((acc, value) => {
            Object.entries(value).forEach(([importPath, count]) => {
                acc[importPath] = acc[importPath] ? acc[importPath] + count : count;
            });
            return acc;
        }, {});

        const normalImport = filesData.map(fileSource => {
            return this.calcNormalImport(fileSource)
        }).reduce((acc, value) => {
            Object.entries(value).forEach(([importPath, count]) => {
                acc[importPath] = acc[importPath] ? acc[importPath] + count : count;
            });
            return acc;
        }, {});

        return {
            oldImport,
            normalImport
        };
    }

    fetchListServices(): Promise<Array<string>> {
        return stashTransport.fetchListRepo('T15').then((result) => {
            return result.map(({ name }) => name)
        })
    }
}

export const checkUiKitUse = new CheckUiKitUse();
