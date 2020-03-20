import * as inquirer from 'inquirer';

const stateBar = new inquirer.ui.BottomBar();

export function statusBar(status: string) {
    stateBar.updateBottomBar(status);
}

export function log(str: string) {
    stateBar.log.write(str);
}
