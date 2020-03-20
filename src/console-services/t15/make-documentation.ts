import * as fs from 'fs';
import * as inquirer from 'inquirer';
import * as json2md from 'json2md';
import * as path from 'path';
import { T15Manifest } from './manifest';

const promt = inquirer.createPromptModule();
const ui = new inquirer.ui.BottomBar();

export async function makeDocumentation(manifestPath: string): Promise<void> {
    ui.log.write(
        'Адрес репозитория сервисов https://stash.bank24.int/projects/T15/repos/t15-documentation/browse/services');
    console.log(manifestPath);
    let manifest: T15Manifest = JSON.parse(fs.readFileSync(manifestPath, {encoding: 'utf-8'}));

    const jsonPath = path.resolve(process.cwd(), `${manifest.name}.doc.json`);

    let defaultJson: Record<string, string> = {};
    if (fs.existsSync(jsonPath)) {
        defaultJson = JSON.parse(fs.readFileSync(jsonPath, {encoding: 'utf-8'}));
    }

    const { serviceDescription } = await promt({
        type: 'input',
        name: 'serviceDescription',
        default: defaultJson.serviceDescription,
        message: `Описание сервиса`
    });

    ui.log.write('Ответсвенные');

    const { team } = await promt({
        type: 'input',
        name: 'team',
        default: defaultJson.team,
        message: `Команда`
    });

    const { frontenders } = await promt({
        type: 'input',
        name: 'frontenders',
        default: defaultJson.frontenders,
        message: `Фронтэнд-разработчики`
    });

    const { qa } = await promt({
        type: 'input',
        name: 'qa',
        default: defaultJson.qa,
        message: `Тестировщики`
    });

    const { backenders } = await promt({
        type: 'input',
        name: 'backenders',
        default: defaultJson.backenders,
        message: `Бэкэнд-разработчики`
    });

    const { disigns } = await promt({
        type: 'input',
        name: 'disigns',
        default: defaultJson.disigns,
        message: `Дизайнеры`
    });

    ui.log.write('Ссылки на зависимсоти');

    const { repositoryUrl } = await promt({
        type: 'input',
        name: 'repositoryUrl',
        default: defaultJson.repositoryUrl,
        message: `Ссылка на репозиторий`
    });

    const { disignUrl } = await promt({
        type: 'input',
        name: 'disignUrl',
        default: defaultJson.disignUrl,
        message: `Ссылка на дизайн`
    });

    const { teamCityUrl } = await promt({
        type: 'input',
        name: 'teamCityUrl',
        default: defaultJson.teamCityUrl,
        message: `Ссылка на тимсити`
    });

    const { manifestUrl } = await promt({
        type: 'input',
        name: 'manifestUrl',
        default: defaultJson.manifestUrl,
        message: `Ссылка на манифест в репозитории`
    });

    const md = json2md([
        { h1: manifest.name },
        { blockquote: serviceDescription },
        { h2: 'Ответственные' },
        {
            ul: [
                `команда: ${team}`,
                `фронтендеры: ${frontenders}`,
                `тестировщики: ${qa}`,
                `бэкэнд-разработчики: ${backenders}`,
                `дизайнеры: ${disigns}`
            ]
        },
        { h2: 'Ссылка на зависимости' },

        {
            ul: [
                {
                    link: {
                        title: 'Репозиторий',
                        source: repositoryUrl
                    }
                },
                {
                    link: {
                        title: 'Дизайн',
                        source: disignUrl
                    }
                },
                {
                    link: {
                        title: 'TeamCity',
                        source: teamCityUrl
                    }
                },
                {
                    link: {
                        title: 'Манифест',
                        source: manifestUrl
                    }
                }
            ]
        },
        { h2: 'Параметры манивеста' },
        {
            ul: [
                `имя в манифесте: ${manifest.name}`,
                `тип сервиса: ${manifest.type}`,
                `тип загрузки: ${manifest.loadStrategy}`,
                `роут: ${(manifest as any
                ).route}`
            ]
        }
    ]);

    const json = {
        serviceDescription,
        team,
        frontenders,
        qa,
        backenders,
        disigns,
        repositoryUrl,
        disignUrl,
        teamCityUrl,
        manifestUrl
    };

    fs.writeFileSync(path.resolve(process.cwd(), `${manifest.name}.doc.md`), md);
    fs.writeFileSync(
        path.resolve(process.cwd(), `${manifest.name}.doc.json`),
        JSON.stringify(json, null, 4)
    );

    console.log(json)
}
