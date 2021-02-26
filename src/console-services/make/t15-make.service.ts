import { Command, Console } from 'nestjs-console';
import { TplMaker } from 'src/utils/index';
import * as path from 'path';
import { getAnalyticsInfoFromEventsMap, makeClassName } from './analytics-parser.service';

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

    @Command({
        command: 'analyticsClass <filePath>',
        description: 'класс с методами аналитики'
    })
    analyticsClass(filePath: string) {
        const maker = new TplMaker(path.resolve(__dirname, './templates'), 'analytics-class');
        const info = getAnalyticsInfoFromEventsMap(filePath);

        for (const [category, events] of Object.entries(info)) {
            const className = makeClassName(category);
            maker.makeFromTpl({category, className, events});
        }
    }
}
