import * as fs from 'fs';
import * as inquirer from 'inquirer';
import { Command, Console } from 'nestjs-console';
import { execSync } from 'child_process';

const promt = inquirer.createPromptModule();

const Registry  = {
    'http://nexus.bank24.int/repository/npm-group/': 'tochka',
    'http://nexus.bank24.int/repository/tochka-modules/': 'tochka_publish',
    'https://registry.npmjs.com/': 'global_npm'
};

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
    registry?: {
        url: string;
    }
}

function findConfigPath() {
    const arPath = __dirname.split('/');
    let resultPath = `~/Documents/ebash`;
    for (const path of arPath) {
        if (fs.existsSync([...arPath, 'ebash.config.json'].join('/'))) {
            resultPath = arPath.join('/');
            break;
        }
        arPath.pop()
    }
    return resultPath;
}

@Console({
    name: 'config',
    description: 'Настройка конфигурационых параметов CLi'
})
export class ConfigService {
    static configPath: string = findConfigPath();
    static configFile: string = `${ConfigService.configPath}/ebash.config.json`;

    get config(): IConfig {
        if (!fs.existsSync(ConfigService.configFile)) {
            return {};
        }
        return JSON.parse(fs.readFileSync(ConfigService.configFile, { encoding: 'utf-8' }));
    }

    constructor() {
        this.makeConfigIfNotExist();
    }

    private makeConfigIfNotExist() {
        if (!fs.existsSync(ConfigService.configFile)) {
            this.setConfig(() => {
                return {}
            })
        }
    }

    setConfig(fn: (config: IConfig) => IConfig) {
        const result = fn(this.config);
        fs.mkdirSync(ConfigService.configPath, { recursive: true });
        fs.writeFileSync(ConfigService.configFile, JSON.stringify(result));
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

    @Command({
        command: 'registry',
        description: '',
        options: [
            {
                flags: '-s, --show',
                description: ' Текущая и возможнные конфигурации'
            },
            {
                flags: '-r, --registry <registryName>',
                description: 'Переключить глобальную конфигурацию registry'
            }
        ]
    })
    async registry({ show, registry }) {
        const currentRegistry = execSync('npm config get registry', {encoding: 'utf-8'}).trim();
        if (show) {
            const cloneRegistry = { ...Registry };
            console.table(cloneRegistry);
            console.log('Текущий:', Registry[currentRegistry] || 'Уникальный', currentRegistry);
            return;
        }

        if (!registry) {
            const { nextRegistry } = await promt({
                type: 'list',
                name: 'nextRegistry',
                message: `Выберите registry`,
                default: currentRegistry,
                choices: Object.entries(Registry).map(([url, name]) => (
                    {
                        name: `${name} (${url})`,
                        value: url
                    }
                ))
            });
            registry = nextRegistry;
        }

        if (registry !== currentRegistry) {
            execSync(`npm config set registry ${registry}`);
        }
    }
}

let resultConfig: IConfig;
if (!fs.existsSync(ConfigService.configFile)) {
    resultConfig = {};
} else {
    resultConfig = JSON.parse(fs.readFileSync(ConfigService.configFile, { encoding: 'utf-8' }));
}
export const config: IConfig = resultConfig;
