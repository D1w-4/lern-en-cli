import * as fs from 'fs';
import * as template from 'lodash.template';
import * as path from 'path';

interface ITpl {
    content: (data: any) => string;
    fileName: (data: any) => string;
}

export class TplMaker {
    static eb = {
        toUpper(str: string): string {
            str = TplMaker.eb.toSnek(str).split('-').reduce((acc, value) => {
                return `${acc}${value[0].toUpperCase()}${value.slice(1)}`
            }, '');
            return `${str[0].toUpperCase()}${str.slice(1)}`
        },
        toSnek(str: string): string {
            return str.split('').reduce((acc, value) => {
                if (value.toUpperCase() === value && value.toUpperCase() !== value.toLowerCase()) {
                    acc = `${acc}-${value}`
                } else {
                    acc = `${acc}${value}`
                }
                return acc;
            }).toLowerCase();
        }
    };
    private tplList: Array<ITpl>;
    private tplPath: string;
    constructor(rootDir: string, tplName: string) {
        this.tplPath = path.resolve(rootDir, tplName);
        const fileList = this.scanDir();
        this.tplList = this.readTpl(fileList);
    }

    private readTpl(filesPath: Array<string>): Array<ITpl> {
        return filesPath.map(filePath => {
            const key = path.join(
                path.dirname(filePath).replace(`${this.tplPath}/`, ''),
                path.basename(filePath, '.tpl')
            );
            const value = fs.readFileSync(filePath, { encoding: 'utf-8' });

            return {
                content: template(value, { imports: { eb: TplMaker.eb } }),
                fileName: template(key, { imports: { eb: TplMaker.eb } })
            };
        });
    }

    private scanDir(currentPath = this.tplPath): Array<string> {
        return fs
            .readdirSync(currentPath).reduce((acc, filePath) => {
                const nextPath = path.resolve(currentPath, filePath);

                if (fs.lstatSync(nextPath).isDirectory()) {
                    acc.push(...this.scanDir(nextPath));
                } else if (nextPath.split('.').pop() === 'tpl') {
                    acc.push(nextPath);
                }

                return acc;
            }, [])
    }

    makeFromTpl(data: any): void {
        const tplData = this.tplList.reduce((acc, { content, fileName }) => {
            acc[fileName(data)] = content(data);
            return acc;
        }, {});
        this.writeFiles(tplData);
    }

    private writeFiles(data: Record<string, string>) {
        Object.entries(data).forEach(([filePath, content]) => {
            path.dirname(filePath).split('/').forEach((dirName) => {
               const currentPath = path.join(process.cwd(), dirName);
               if (!fs.existsSync(currentPath)) {
                   fs.mkdirSync(currentPath)
               }
            });
            fs.writeFileSync(path.join(process.cwd(), filePath), content);
        })
    }
}
