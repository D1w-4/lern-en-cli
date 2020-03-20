import { execSync } from 'child_process';
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import * as path from 'path';
import { actualize } from 'src/console-services/t15/actualize';
import { log } from 'src/utils';

const promt = inquirer.createPromptModule();
const ui = new inquirer.ui.BottomBar();

export class MakeMicroservice {
    serviceName: string;
    servicePath: string;

    /**
     * Название сервиса через тире
     */
    fileService: string;
    /**
     * Название сервиса через землю
     */
    deployService: string;
    /**
     * Название main компонента
     */
    componentService: string;
    cloneRepository() {
        ui.log.write('Клонирую репозиторий');
        execSync('git clone ssh://git@stash.bank24.int:7999/fdfd/react-service-boilerplate.git .');
    }

    async createServiceDir() {
        const { serviceName } = await promt({
            type: 'input',
            name: 'serviceName',
            default: 't15-app',
            message: 'Название сервиса (через тире)'
        });
        this.serviceName = serviceName;
        this.servicePath = path.resolve(process.cwd(), serviceName);
        this.fileService = serviceName;
        this.deployService = serviceName.split('-').join('_');
        this.componentService = serviceName.split('-').map((s) =>`${s[0].toUpperCase()}${s.slice(1)}`).join('');

        if (fs.existsSync(this.servicePath)) {
            const { hasFoolExist } = await promt({
                type: 'confirm',
                name: 'hasFoolExist',
                message: 'Папка с таким именим уже существует создать сервис в ней?'
            });
            if (!hasFoolExist) {
                return;
            }
        } else {
            fs.mkdirSync(this.servicePath);
        }
        return serviceName;
    }

    renameData() {
        log('Персонализирую проект');
        let renameFrom = path.resolve(this.servicePath, 'src', '%file-service%');
        let renameTo = path.resolve(this.servicePath, 'src', this.fileService);
        fs.renameSync(renameFrom, renameTo);

        renameFrom = path.resolve(this.servicePath, 'src', this.fileService, 'root-components', 'service-page.tsx');
        renameTo = path.resolve(this.servicePath, 'src', this.fileService, 'root-components', `${this.fileService}-page.tsx`);
        fs.renameSync(renameFrom, renameTo);

        for(let localPath of ['package.json', 'src/export.ts']) {
            let filePath = path.resolve(this.servicePath, localPath);
            let fileData = fs.readFileSync(filePath, 'utf8');
            fileData = fileData.replace(/%file-service%/gi, this.fileService);
            fs.writeFileSync(filePath, fileData);
        }

        for(let localPath of ['src/index.tsx', 'config/service.config.json']) {
            let filePath = path.resolve(this.servicePath, localPath);
            let fileData = fs.readFileSync(filePath, 'utf8');
            fileData = fileData.replace(/%deploy_service%/gi, this.deployService);
            fs.writeFileSync(filePath, fileData);
        }

        for(let localPath of [
            path.join('src', this.fileService, 'root-components', `${this.fileService}-page.tsx`),
            path.join('src', 'export.ts')
        ]) {
         let filePath = path.resolve(this.servicePath, localPath);
            let fileData = fs.readFileSync(filePath, 'utf8');
            fileData = fileData.replace(/%ComponentService%/gi, this.componentService);
            fs.writeFileSync(filePath, fileData);
        }

        renameFrom = path.join('public', 'manifest.json');
        const manifest = JSON.parse(fs.readFileSync(renameFrom, {encoding: 'utf-8'}));
        manifest.name = this.deployService;
        manifest.route = `/${this.serviceName}`;
        fs.writeFileSync(renameFrom, JSON.stringify(manifest, null, 4));
    }

    /**
     * При создании сервиса процесс переходит в папку созданого проекта и обратно не возвращается
     * @returns {Promise<void>}
     */
    async run() {
        const serviceName = await this.createServiceDir();
        const prevDir = process.cwd();
        process.chdir(`./${serviceName}`);
        this.cloneRepository();
        this.renameData();
        process.chdir(prevDir);
    }
}

export const makeMicroservice = new MakeMicroservice();
