import * as fs from 'fs';
import * as inquirer from 'inquirer';
import { Command, Console } from 'nestjs-console';

const promt = inquirer.createPromptModule();

export interface IConfig {
    gitlab?: {
        token: string;
    }
    jira?: {
        token: string;
    }
    stash?: {
        token: string;
    },
}

@Console({
    name: 'config',
    description: 'Настройка конфигурационых параметов CLi'
})
export class ConfigService {
    static configPath: string = `${__dirname}/config.json`;

    private get config(): IConfig {
        if (!fs.existsSync(ConfigService.configPath)) {
            return {};
        }
        return JSON.parse(fs.readFileSync(ConfigService.configPath, { encoding: 'utf-8' }));
    }

    constructor() {
        this.makeConfigIfNotExist();
    }

    private makeConfigIfNotExist() {
        if (!fs.existsSync(ConfigService.configPath)) {
            this.setConfig(() => {
                return {}
            })
        }
    }

    private setConfig(fn: (config: IConfig) => IConfig) {
        const result = fn(this.config);
        fs.writeFileSync(ConfigService.configPath, JSON.stringify(result));
    }

    @Command({
        command: 'gitlab',
        description: 'настройка доступ к gitlab (https://gitlab.tochka-tech.com/)',
        options: [
            {
                flags: '-t, --token <token>',
                description: 'Токен доступа в gitlab'
            }
        ]
    })
    gitlab({ token }) {
        this.setConfig((config) => {
            const stash = config.gitlab || {};
            return {
                ...config,
                gitlab: {
                    ...stash,
                    token
                }
            }
        })
    }

    @Command({
        command: 'jira',
        description: 'настройка доступ к jira (https://jira.tochka.com/)',
        options: [
            {
                flags: '-t, --token',
                description: 'установка токена доступаы'
            }
        ]
    })
    async jira() {
        const { login } = await promt({
            type: 'input',
            name: 'login',
            message: `логин`
        });

        const { password } = await promt({
            type: 'password',
            name: 'password',
            message: `пароль`
        });

        const token = new Buffer(login + ':' + password).toString('base64');
        console.log(token);
        this.setConfig((config) => {
            const jira = config.jira || {};
            return {
                ...config,
                jira: {
                    ...jira,
                    token
                }
            }
        })
    }

    @Command({
        command: 'list',
        description: 'Список всех настроек'
    })
    list() {
        console.log(this.config);
    }

    @Command({
        command: 'stash',
        description: 'настройка доступ к stash (https://stash.bank24.int/)',
        options: [
            {
                flags: '-t, --token <token>',
                description: 'Токен доступа в stash'
            }
        ]
    })
    stash({ token }) {
        this.setConfig((config) => {
            const stash = config.stash || {};
            return {
                ...config,
                stash: {
                    ...stash,
                    token
                }
            }
        })
    }
}

let resultConfig: IConfig;
if (!fs.existsSync(ConfigService.configPath)) {
    resultConfig = {};
} else {
    resultConfig = JSON.parse(fs.readFileSync(ConfigService.configPath, { encoding: 'utf-8' }));
}
export const config: IConfig = resultConfig;
