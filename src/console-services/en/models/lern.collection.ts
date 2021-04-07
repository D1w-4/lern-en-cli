import * as fs from 'fs';
import { randomInt } from '../../../utils';
import { LernModel } from './lern.model';

export class LernCollection {
  activeTag = '';
  items: Array<LernModel> = [];

  constructor(private filePath: string) {
    this.items = JSON.parse(
      fs.readFileSync(this.filePath, { encoding: 'utf-8' }),
    ).map(data => new LernModel(data));
  }

  addLernModerTag(lernModel: LernModel, tag: string): void {
    const id = lernModel.tags.findIndex(w => w === tag);
    if (id === -1) {
      lernModel.tags.push(tag);
      this.saveCollection();
    }
  }

  addModel(data: any): void {
    const lernModel = new LernModel(data);
    this.items.push(lernModel);
    this.saveCollection();
  }

  getTags(): Array<string> {
    const tags = new Set<string>();
    this.items.forEach((lernModel: LernModel): void => {
      lernModel.tags.forEach(tag => tags.add(tag));
    });

    return Array.from<string>(tags);
  }

  itemsByTag(): Array<LernModel> {
    return this.items.filter(lernModel => lernModel.tags.includes(this.activeTag));
  }

  removeLernModerTag(lernModel: LernModel, tag: string): void {
    const id = lernModel.tags.findIndex(w => w === tag);
    lernModel.tags.splice(id, 1);
    this.saveCollection();
  }

  saveCollection(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.items, null, 4));
  }

  selectRandomLernModel(): LernModel {
    const items = this.itemsByTag();
    const errorWords = items.filter(item => {
      if (item.break) {
        return false;
      }

      return item.countErrors - item.countSuccess > 2;
    });

    const errorIds = errorWords.map(({ id }: LernModel): string => id);

    if (errorWords.length >= 5) {
      return errorWords[randomInt(0, errorWords.length - 1)];
    }
    const sliceItems = items.filter((lernModel) => {
      return !errorIds.includes(lernModel.id);
    }).slice(0, 5 - errorIds.length);

    const fullErrorItems = [...sliceItems, ...errorWords];
    return fullErrorItems[randomInt(0, fullErrorItems.length - 1)];
  }

  setActiveTag(tag: string): void {
    this.activeTag = tag;
  }

  toggleBreakInModel(lernMode: LernModel, toggle): void {
    lernMode.break = toggle;
    this.saveCollection();
  }

  upError(item: LernModel): void {
    item.countErrors++;
    this.saveCollection();
  }

  upRepeat(item: LernModel): void {
    item.countRepeat++;
    this.saveCollection();
  }

  upSuccess(item: LernModel): void {
    item.countSuccess++;
    this.saveCollection();
  }
}
