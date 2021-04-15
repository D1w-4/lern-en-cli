import * as fs from 'fs';
import { randomInt } from '../../../utils';
import { LearnModel } from './learn.model';

export class LearnCollection {
  activeTag = '';
  items: Array<LearnModel> = [];

  constructor(private filePath: string) {
    this.items = JSON.parse(
      fs.readFileSync(this.filePath, { encoding: 'utf-8' }),
    ).map(data => new LearnModel(data));
  }

  addLearnModerTag(learnModel: LearnModel, tag: string): void {
    const id = learnModel.tags.findIndex(w => w === tag);
    if (id === -1) {
      learnModel.tags.push(tag);
      this.saveCollection();
    }
  }

  addModel(data: any): void {
    const learnModel = new LearnModel(data);
    this.items.push(learnModel);
    this.saveCollection();
  }

  getTags(): Array<string> {
    const tags = new Set<string>();
    this.items.forEach((learnModel: LearnModel): void => {
      learnModel.tags.forEach(tag => tags.add(tag));
    });

    return Array.from<string>(tags);
  }

  itemsByTag(): Array<LearnModel> {
    return this.items.filter(learnModel => learnModel.tags.includes(this.activeTag));
  }

  removeLearnModerTag(learnModel: LearnModel, tag: string): void {
    const id = learnModel.tags.findIndex(w => w === tag);
    learnModel.tags.splice(id, 1);
    this.saveCollection();
  }

  saveCollection(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.items, null, 4));
  }

  selectRandomLearnModel(): LearnModel {
    const items = this.itemsByTag();
    const errorWords = items.filter(item => {
      if (item.break) {
        return false;
      }

      return item.countErrors - item.countSuccess > 2;
    });

    const errorIds = errorWords.map(({ id }: LearnModel): string => id);

    if (errorWords.length >= 5) {
      return errorWords[randomInt(0, errorWords.length - 1)];
    }

    const sliceItems = items.filter((learnModel) => {
      return !errorIds.includes(learnModel.id);
    }).slice(0, 5 - errorIds.length);

    const fullErrorItems = [...sliceItems, ...errorWords];
    return fullErrorItems[randomInt(0, fullErrorItems.length - 1)];
  }

  setActiveTag(tag: string): void {
    this.activeTag = tag;
  }

  toggleBreakInModel(learnMode: LearnModel, toggle): void {
    learnMode.break = toggle;
    this.saveCollection();
  }

  upError(item: LearnModel): void {
    item.countErrors++;
    this.saveCollection();
  }

  upRepeat(item: LearnModel): void {
    item.countRepeat++;
    this.saveCollection();
  }

  upSuccess(item: LearnModel): void {
    item.countSuccess++;
    this.saveCollection();
  }
}
