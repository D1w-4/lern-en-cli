import * as fs from 'fs';
import * as inquirer from 'inquirer';
import { Command, Console } from 'nestjs-console';
import { stashTransport } from 'src/api/stash';
import { RepositoryModel } from 'src/api/stash/models';
import { actualize } from 'src/console-services/t15/actualize';
import { makeDocumentation } from 'src/console-services/t15/make-documentation';
import { makeMicroservice } from 'src/console-services/t15/make-microservice';
import { t15ChoiseService } from 'src/utils';
import { manifest } from './manifest';

const promt = inquirer.createPromptModule();
const ui = new inquirer.ui.BottomBar();

@Console({
    name: 't15',
    description: 'Утилиты для работы с сервисами Точки 1.5'
})
export class T15Service {
    static defaultManifestPath = `${process.cwd()}/public/manifest.json`;

    @Command({
        command: 'actualize',
        description: 'Обновить зависимости микросервиса'
    })
    async actualize() {
        await actualize.run();
    }

    @Command({
        command: 'info',
        description: 'Информация о сервисе',
        options: [
            {
                flags: '-s, --service <serviceName>',
                description: 'Название сервиса'
            },
            {
                flags: '-b, --branch <branchName>',
                description: 'Target branch',
                defaultValue: 'master'
            }
        ]
    })
    async info({ service, branch }): Promise<void> {
        if (!service) {
            service = await t15ChoiseService();
        }
        const result = await stashTransport.fetchRawFile(
            'T15',
            't15-documentation',
            `services/${service}/README.md`,
            branch
        );
        console.log(result);
    }

    @Command({
        command: 'list',
        description: 'Список сервисов в проекте T15'
    })
    async list(): Promise<Array<RepositoryModel>> {
        const result = await stashTransport.fetchListRepo('T15');
        console.table(result.map(({ name }) => name));
        return result;
    }

    @Command({
        command: 'create',
        description: 'Создание нового микросервиса'
    })
    async makeMicroservice() {
        await makeMicroservice.run();
        const manifestPath = `${process.cwd()}/${makeMicroservice.fileService}/config/service.config.json`;
        await manifest.main(manifestPath);

        const prevPath = process.cwd();

        process.chdir(`${process.cwd()}/${makeMicroservice.fileService}`);
        await actualize.run();

        const { isMakeDocumentation } = await promt({
            type: 'confirm',
            name: 'isMakeDocumentation',
            message: 'Микросервис создан, создать markdown документацию сервиса?'
        });

        if (isMakeDocumentation) {
            await makeDocumentation(manifestPath);
        }

        process.chdir(prevPath);
    }

    @Command({
        command: 'manifest <manifestPath>',
        description: 'Измененить манифест'
    })
    async manifest(manifestPath: string = T15Service.defaultManifestPath) {
        if (!fs.existsSync(manifestPath)) {
            ui.log.write(`Не удалось найти файл манифеста в проекте: ${manifestPath}`);
            return;
        }
        await manifest.main(manifestPath);
    }

    @Command({
        command: 'doc <manifestPath>',
        description: 'Создание и обновление markdown документации сервиса'
    })
    async updateDocumentation(manifestPath: string = T15Service.defaultManifestPath) {
        if (!fs.existsSync(manifestPath)) {
            ui.log.write(`Не удалось найти файл манифеста в проекте: ${manifestPath}`);
            return;
        }
        await makeDocumentation(manifestPath);
    }

}
