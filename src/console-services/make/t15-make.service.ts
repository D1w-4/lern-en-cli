import { Command, Console } from 'nestjs-console';
import { TplMaker } from 'src/utils/index';
import * as path from 'path';
@Console({
    name: 'make',
    description: 'Кодогенерация'
})
export class T15MakeService {
    @Command({
        command: 'fn <name>',
        description: 'функциональный компонент'
    })
    fnComponent(name: string) {
        const maker = new TplMaker(path.resolve(__dirname, './templates'), 'fn-component');
        maker.makeFromTpl({name});
    }

    @Command({
        command: 'class <name>',
        description: 'классовый компонент'
    })
    classComponent(name: string) {
        const maker = new TplMaker(path.resolve(__dirname, './templates'), 'class-component');
        maker.makeFromTpl({name});
    }

}
