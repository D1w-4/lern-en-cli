import * as inquirer from 'inquirer';
import { checkUiKitUse } from 'src/console-services/t15-analyze/check-ui-kit-use';

const promt = inquirer.createPromptModule();

export async function t15ChoiseService(): Promise<string> {
    let serviceList = await checkUiKitUse.fetchListServices();
    const { choiseServices } = await promt({
        type: 'list',
        name: 'choiseServices',
        choices: serviceList,
        message: 'Выбери сервис для анализа'
    });

    return choiseServices.length ? choiseServices : serviceList;
}
