import * as fs from 'fs';
import * as inquirer from 'inquirer';
import { parse, transforms } from 'json2csv';
import * as moment from 'moment';
import { Command, Console } from 'nestjs-console';
import * as path from 'path';
import { gitlabTransport } from 'src/api/gitlab/gitlab.transport';
import { IssueModel } from 'src/api/gitlab/models';
import { checkStyleUse } from 'src/console-services/t15-analyze/check-style-use';
import { checkUiKitUse } from 'src/console-services/t15-analyze/check-ui-kit-use';
import { commitByDate } from 'src/console-services/t15-analyze/commitByDate';
import { statusBar, t15ChoiseServices, getFileList } from 'src/utils';

const promt = inquirer.createPromptModule();

interface IUseUiKit {
    result: Array<{
        name: string;
        oldImport: {
            total: number;
            [key: string]: number;
        },
        normalImport: {
            total: number;
            [key: string]: number;
        }
    }>;
    total: {
        oldImport: number;
        normalImport: number;
    }
}

interface IIssues {
    date: string;
    average: string;
    average_hm: string;
    count: number
}

@Console({
    name: 't15-analyze',
    description: 'Аналитика сервисов полторашки'
})
export class T15AnalizeService {
    private componentRating({ result }: IUseUiKit): string {
        const data: Record<string, number> = {};
        result.forEach(service => {

            Object.entries(service.oldImport).forEach(([key, value]) => {
                data[key] = data[key] ? data[key] + value : value;
            });
            Object.entries(service.normalImport).forEach(([key, value]) => {
                data[key] = data[key] ? data[key] + value : value;
            })
        });
        delete data.total;
        return parse(Object.entries(data).map(([name, value]) => {
            return {
                name,
                value
            }
        }));
    }

    private newUIKit({ total }: IUseUiKit): string {
        return parse(total);
    }

    private useInServices({ result }: IUseUiKit): string {
        const data = result.map(service => {
            return {
                name: service.name,
                total: service.oldImport.total + service.normalImport.total
            }
        });
        return parse(data);
    }

    private timeCloseIssues(result: Array<IIssues>): string {
        const data = result.map(({date, average}) => {
            return {
                date,
                average
            }
        });

        return parse(data);
    }

    private countCloseIssues(result: Array<IIssues>): string {
        const data = result.map(({date, count}) => {
            return {
                date,
                count
            }
        });

        return parse(data);
    }

    @Command({
        command: 'issues',
        description: 'статистика закрытия  issues по месяцам',
        options: [
            {
                flags: '-o, --output <outputPathpat>',
                description: 'Файл для сохранения JSON результатов'
            },
            {
                flags: '-c, --csv',
                description: 'Вывод в файлы формата csv'
            }
        ]
    })
    async issues({ output, csv }) {
        let csvType = [];
        if (csv) {
            const data = await promt({
                type: 'checkbox',
                name: 'csvType',
                choices: [
                    {
                        name: 'Время на закрытие issues',
                        value: 'timeCloseIssues'
                    },
                    {
                        name: 'Количество закрытых issues',
                        value: 'countCloseIssues'
                    }
                ],
                message: `Как отформатирова данные?`
            });

            csvType = data.csvType;
        }

        let issues = await gitlabTransport.issues(331, 'closed');
        console.log(issues[0]);
        issues = issues.filter((merge_requests_count) => {
            return merge_requests_count;
        });

        issues.sort((a, b) => {
            return a.closed_at > b.closed_at ? 1 : -1;
        });

        const resultByMonth: Record<string, Array<IssueModel>> = {};

        issues.forEach((issue) => {
            const key = moment(issue.closed_at).format('YYYY-MM');
            resultByMonth[key] = resultByMonth[key] ?
                [...resultByMonth[key], issue] :
                [issue];
        });

        const result = [];
        Object.entries(resultByMonth).forEach(([date, issueList]) => {
            const resultTime = issueList.map(({ created_at, closed_at }) => {
                return new Date(closed_at).getTime() - new Date(created_at).getTime();
            });

            const average = resultTime.reduce((acc, value) => {
                return acc + value;
            }, 0) / resultTime.length;

            const dr = moment.duration(average);
            result.push({
                date,
                average: `${Math.floor(dr.asHours())}:${dr.minutes()}`,
                average_hm: `${dr.days()}d ${dr.hours()}:${dr.minutes()}:00`,
                count: resultTime.length
            })
        });

        if (csv) {
            csvType.forEach(type => {
                fs.writeFileSync(path.resolve(process.cwd(), `${type}.csv`), this[type](result));
            });
        }
        if (output) {
            fs.writeFileSync(path.resolve(process.cwd(), output), JSON.stringify(result, null, 4));
        }

        console.table(result);
    }

    @Command({
        command: 'use-style',
        description: `Анализ использования css в микросевисах полторашки`,
        options: [
            {
                flags: '-r, --repos <repoList>',
                description: 'Название репозитория через запятую',
                defaultValue: [],
                fn: (value: string) => value.split(',')
            },
            {
                flags: '-b, --branch <branchName>',
                description: 'Target branch',
                defaultValue: 'master'
            },
            {
                flags: '-o, --output <path>',
                description: 'Файл для созхранения результатов'
            },
            {
                flags: '-a, --all',
                description: 'Сканировать все репозитории'
            },
            {
                flags: '-s, --start <date>',
                description: 'дата начала среза'
            },
            {
                flags: '-e, --end <date>',
                description: 'дата окончания среза'
            },
            {
                flags: '-c, --csv <path>',
                description: 'Вывод в файл формата csv'
            }

        ]
    })
    async useStyle({ repos: serviceList, branch, output, all, start, end, csv }): Promise<void> {
        if (all) {
            serviceList = await checkUiKitUse.fetchListServices();
        } else if (!serviceList.length) {
            serviceList = await t15ChoiseServices();
        }

        const result = [];

        const fetchService = async (name) => {
            if (start && end) {
                const diffCommit = await commitByDate.byDate(start, end, name, branch);
                if (!diffCommit) {
                    return;
                }
                const serviceResultFrom = await checkStyleUse.checkStyleUse(name, diffCommit.from);
                const serviceResultTo = await checkStyleUse.checkStyleUse(name, diffCommit.to);
                result.push({
                    name,
                    prevTotalRows: serviceResultFrom.totalRows,
                    totalRows: serviceResultTo.totalRows,
                    prevTotalFiles: serviceResultFrom.totalFiles,
                    totalFiles: serviceResultTo.totalFiles,
                    start,
                    end
                });
            } else {
                const serviceResult = await checkStyleUse.checkStyleUse(name, branch);
                result.push({
                    name,
                    totalRows: serviceResult.totalRows,
                    totalFiles: serviceResult.totalFiles
                });
            }
        };

        let counterAnalyze = 1;
        let iterator = 0;
        while ((serviceList.length
               ) !== iterator) {
            const name = serviceList[iterator];
            try {
                statusBar(`${counterAnalyze++}/${serviceList.length} "${name}"`);
                await fetchService(name);
                iterator++;
            } catch (e) {
                console.error(e);
                const { continueHasError } = await promt({
                    type: 'list',
                    name: 'continueHasError',
                    choices: ['repeat', 'continue', 'end'],
                    message: `Во время анализа репозитория "${name}" произошла ошибка, продолжить?`
                });
                if (continueHasError === 'repeat') {
                    continue
                } else if (continueHasError === 'continue') {
                    iterator++;
                    continue;
                } else {
                    break;
                }
            }
        }

        if (output) {
            fs.writeFileSync(path.resolve(process.cwd(), output), JSON.stringify(result, null, 4));
        }

        if (csv) {
            fs.writeFileSync(path.resolve(process.cwd(), csv), parse(result));
        }
        console.log(JSON.stringify(result, null, 4));
    }

    @Command({
        command: 'calc-ui-kit-imports',
        description: 'Подсчет количества импортов каждого компонента в директории',
        options: [
            {
                flags: '-p, --path <pathName>',
                description: 'Директория сканирования',
                defaultValue: process.cwd()
            },
            {
                flags: '-o, --output <outputName>',
                description: 'Файл для сохранения JSON - результатов',
                defaultValue: './calc-ui-kit-imports.json'
            }
        ]
    })
    async calcImportInService({path, output}): Promise<void> {
        const fileList = await getFileList(path, ['ts', 'tsx']);
        const prList= fileList.map((p) => {
            return new Promise<string>((resolve,reject) => {
                fs.readFile(p, {encoding: 'utf8'}, (err, content) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(content);
                    }
                })
            })
        });

        const contentList = await Promise.all(prList);
        const result = contentList.reduce((acc,p) => {
            const r = checkUiKitUse.calcNormalImport(p);
            Object.entries(r).forEach(([key, value]) => {
                if (!acc[key]) {
                    acc[key] = value
                } else {
                    acc[key] += value;
                }
            });
            return acc;
        }, {});
        console.log(JSON.stringify(result, null, 4));
        fs.writeFileSync(output, JSON.stringify(result, null, 4));
    }

    @Command({
        command: 'use-ui-kit',
        description: `Анализ использования ui-kit в микросевисах полторашки`,
        options: [
            {
                flags: '-r, --repos <repoList>',
                description: 'Название репозитория через запятую',
                defaultValue: [],
                fn: (value: string) => value.split(',')
            },
            {
                flags: '-b, --branch <branchName>',
                description: 'Target branch',
                defaultValue: 'master'
            },
            {
                flags: '-o, --output <path>',
                description: 'Файл для сохранения JSON - результатов'
            },
            {
                flags: '-a, --all',
                description: 'Сканировать все репозитории'
            },
            {
                flags: '-c, --csv',
                description: 'Вывод в файлы формата csv'
            }
        ]
    })
    /**
     * количество новых и старых имортов
     * частота использования компонентов по сервисам
     */
    async useUiKit({ repos: serviceList, branch, output, all, csv }): Promise<void> {
        let csvType = [];
        if (csv) {
            const data = await promt({
                type: 'checkbox',
                name: 'csvType',
                choices: [
                    {
                        name: 'Доля ui-kit 2.0',
                        value: 'newUIKit'
                    },
                    {
                        name: 'Использование в сервисах',
                        value: 'useInServices'
                    },
                    {

                        name: 'Рейтинг компонентов',
                        value: 'componentRating'
                    }
                ],
                message: `Как отформатирова данные?`
            });

            csvType = data.csvType;
        }
        if (all) {
            serviceList = await checkUiKitUse.fetchListServices();
        } else if (!serviceList.length) {
            serviceList = await t15ChoiseServices();
        }
        const result = [];
        let counterAnalyze = 1;
        const fetchService = async (name: string) => {
            statusBar(`${counterAnalyze++}/${serviceList.length} "${name}"`);
            const serviceResult = await checkUiKitUse.checkUiKitUse(name, branch);
            serviceResult.oldImport.total = Object
                .values(serviceResult.oldImport)
                .reduce((acc: number, value: number) => acc + value, 0);

            serviceResult.normalImport.total = Object
                .values(serviceResult.normalImport)
                .reduce((acc: number, value: number) => acc + value, 0);
            result.push({ name, ...serviceResult });
        };

        let iterator = 0;
        while (iterator !== serviceList.length) {
            const name = serviceList[iterator];
            try {
                await fetchService(name);
                iterator++;
            } catch (error) {
                console.log(error);
                const { continueHasError } = await promt({
                    type: 'list',
                    name: 'continueHasError',
                    choices: ['repeat', 'continue', 'end'],
                    message: `Во время анализа репозитория "${name}" произошла ошибка, продолжить?`
                });
                if (continueHasError === 'repeat') {
                    console.error(continueHasError);
                } else if (continueHasError === 'continue') {
                    iterator++;
                    continue;
                } else {
                    break;
                }
            }
        }

        const total = result.reduce((acc, value) => {
            acc.oldImport += value.oldImport.total;
            acc.normalImport += value.normalImport.total;
            return acc;
        }, { oldImport: 0, normalImport: 0 });


        if (csv) {
            csvType.forEach(type => {
                const data = this[type]({ result, total });
                fs.writeFileSync(path.resolve(process.cwd(), `${type}.csv`), data);
            });

        }

        const resultOutput = JSON.stringify({
            result,
            total
        }, null, 4);
        if (output) {
            fs.writeFileSync(path.resolve(process.cwd(), output), resultOutput);
        }

        console.log(resultOutput);
    }
}
