import { Command, Console } from 'nestjs-console';
import { LearnService } from './learn.service';
import { LearnCollection } from './models/learn.collection';

// yarn console:dev en learn ./book.json
@Console({
  name: 'en',
  description: 'Учить',
})
export class En2Service {
  @Command({
    command: 'add <filePath> <en> <ru>',
    description: 'добавить слово',
  })
  add(filePath, en, ru): void {
    const collection = new LearnCollection(filePath);
    const isset = collection.items.some((s) => s.en.includes(en));
    if (isset) {
      console.log(`Уже есть ${en}`);
      return;
    }
    collection.addModel({ en: en.split(','), ru: ru.split(',') });
  }

  @Command({
    command: 'learn <filePath>',
    description: '',
  })
  async learn(filePath: string) {
    const learnService = new LearnService(filePath);
    await learnService.run();
  }
}
