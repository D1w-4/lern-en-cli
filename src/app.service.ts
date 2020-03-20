import { Command, Console } from 'nestjs-console';

@Console()
export class AppService {
    @Command({
        command: 'list <directory>',
        description: 'List content of a directory'
    })
    getHello(...dir): string {
        console.log('hello', dir);
        return 'Hello World!';
    }
}{}
