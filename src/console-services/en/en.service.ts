import { Command, Console } from 'nestjs-console';
import { LearnService } from './learn.service';

// yarn console:dev en learn ./book.json
@Console({
  name: 'en',
  description: 'Учить',
})
export class En2Service {
  @Command({
    command: 'add',
    description: 'добавить слово',
  })
  async add(): Promise<void> {
    const learnService = new LearnService();

    await learnService.addWord();
  }

  @Command({
    command: 'learn',
    description: '',
  })
  async learn() {
    const learnService = new LearnService();
    await learnService.run();
  }

  @Command({
    command: 'dump',
    description: '',
  })
  async dump() {
    const learnService = new LearnService();
    await learnService.dump();
  }
  @Command({
    command: 'restore <path>',
    description: '',
  })
  async restore(dumpPath: string) {
    const learnService = new LearnService();
    await learnService.restoreInDump(dumpPath);
  }
}

