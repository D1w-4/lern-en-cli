import * as inquirer from 'inquirer';
import { checkUiKitUse } from 'src/console-services/t15-analyze/check-ui-kit-use';

const promt = inquirer.createPromptModule();

export async function t15ChoiseServices(): Promise<Array<string>> {
    let serviceList = await checkUiKitUse.fetchListServices();
    const { choiseServices } = await promt({
        type: 'checkbox',
        name: 'choiseServices',
        choices: serviceList,
        message: 'Выбери сервисы для анализа, и нажми enter. Для анализа всех сервисов просто нажми enter'
    });

    return choiseServices.length ? choiseServices : serviceList;
}
