import { Module } from '@nestjs/common';
import { ConsoleModule as nestConsole } from 'nestjs-console';
import * as consoleServices  from './console-services';

@Module({
    imports: [
        nestConsole
    ],
    providers: Object.values(consoleServices),
})
export class ConsoleModule {}
