import * as fs from 'fs';
import * as inquirer from 'inquirer';
import { ModuleLoadStrategy } from 'module-loader-tool';
import { T15Manifest, T15ModuleType } from './interface';

const promt = inquirer.createPromptModule();

export class Manifest {
    async main(manifestPath: string): Promise<void> {
        let existingManifest: T15Manifest & { route: string } = {
            enabled: true,
            fileName: '',
            loadStrategy: ModuleLoadStrategy.IMMEDIATELY,
            name: '',
            route: '',
            type: T15ModuleType.MODAL_ROUTE
        };

        existingManifest = Object.assign(
            existingManifest,
            JSON.parse(fs.readFileSync(manifestPath, { encoding: 'utf-8' }))
        );

        const { name } = await promt({
            type: 'input',
            name: 'name',
            default: existingManifest.name,
            message: `Имя в манифесте(через _)`
        });

        existingManifest.name = name;

        const { loadStrategy } = await promt({
            type: 'list',
            choices: Object.values(ModuleLoadStrategy),
            name: 'loadStrategy',
            default: existingManifest.loadStrategy,
            message: `Cтратегия загрузки (https://stash.bank24.int/projects/T15/repos/t15-documentation/browse/t15-core/manifest.md)`
        });

        existingManifest.loadStrategy = loadStrategy;

        const { type } = await promt({
            type: 'list',
            name: 'type',
            default: existingManifest.type,
            choices: Object.values(T15ModuleType),
            message: `Тип сервиса в манифесте (https://stash.bank24.int/projects/T15/repos/t15-documentation/browse/t15-core/manifest.md)`
        });

        existingManifest.type = type;

        if (type.includes('route')) {
            const { route } = await promt({
                type: 'input',
                name: 'route',
                default: existingManifest.route || '',
                message: `Роут сервиса(если необходим)`
            });

            existingManifest.route = route;
        } else {
            delete existingManifest.route;
        }


        delete existingManifest.enabled;

        const result = JSON.stringify(existingManifest, null, 4);
        fs.writeFileSync(manifestPath, result);
    }
}

export const manifest = new Manifest();
