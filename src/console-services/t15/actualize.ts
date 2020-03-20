import { execSync } from 'child_process';
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import * as path from 'path';
import { stashTransport } from 'src/api/stash';
import { log } from 'src/utils';

const ui = new inquirer.ui.BottomBar();

interface IActualDeps {
    t15Dependencies: string;
}

export class Actualize {
    private async updatePkg() {
        log('Обновляю зависимости');
        const { t15Dependencies } = await this.fetchActualDeps();
        const pkgPath = path.resolve(process.cwd(), 'package.json');
        if (!fs.existsSync(pkgPath)) {
            throw Error('файл package.json не найден');
        }

        const curentPkg = JSON.parse(fs.readFileSync(pkgPath, { encoding: 'utf-8' }));

        ui.log.write(`Текущая версия t15-dependencies: ${
            curentPkg.devDependencies['@tochka-modules/t15-dependencies']
            }`);

        curentPkg.devDependencies['@tochka-modules/t15-dependencies'] = t15Dependencies;
        fs.writeFileSync(pkgPath, JSON.stringify(curentPkg, null, 4));
        ui.log.write(`Устанавливаю @tochka-modules/t15-dependencies`);
        execSync('yarn');
        ui.log.write(`Обновляю зависимости`);
        execSync('node node_modules/@tochka-modules/t15-dependencies/bin/actualize.js && yarn');
    }

    async fetchActualDeps(): Promise<IActualDeps> {
        const pkg = await stashTransport.fetchRawFile<Record<string, string>>(
            'T15',
            't15-dependencies',
            'package.json',
            'master'
        );
        log(`Актуальная версия t15-dependencies: ${pkg.version}`);
        return {
            t15Dependencies: pkg.version
        };
    }

    async run() {
        await this.updatePkg();
    }
}

export const actualize = new Actualize();
