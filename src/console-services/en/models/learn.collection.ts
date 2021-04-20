import { randomInt } from '../../../utils';
import { DataAdapter } from '../adapters/data.adapter';
import { LearnModel } from './learn.model';

export class LearnCollection<TConfig> {
  activeTag = '';
  items: Array<LearnModel> = [];

  constructor(private dataAdapter: DataAdapter) {
  }

  async addLearnModerTag(learnModel: LearnModel, tag: string): Promise<void> {
    const id = learnModel.tags.findIndex(w => w === tag);
    if (id === -1) {
      learnModel.tags.push(tag);
      await this.dataAdapter.update(learnModel);
    }
  }

  async addModel(data: any): Promise<void> {
    const learnModel = new LearnModel(data);
    await this.dataAdapter.add(learnModel);
  }

  getTags(): Array<string> {
    const tags = new Set<string>();
    this.items.forEach((learnModel: LearnModel): void => {
      learnModel.tags.forEach(tag => tags.add(tag));
    });

    return Array.from<string>(tags);
  }

  async init(): Promise<void> {
    this.items = await this.dataAdapter.read();
  }

  itemsByTag(): Array<LearnModel> {
    return this.items.filter(learnModel => learnModel.tags.includes(this.activeTag));
  }

  async removeLearnModerTag(learnModel: LearnModel, tag: string): Promise<void> {
    const id = learnModel.tags.findIndex(w => w === tag);
    learnModel.tags.splice(id, 1);
    await this.dataAdapter.update(learnModel);
  }

  selectRandomLearnModel(): LearnModel {
    const items = [...this.itemsByTag()];
    items.sort((a: LearnModel, b: LearnModel): number => {
      return a.countRepeat > b.countRepeat ? 1 : -1;
    });
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
    }).slice(0, 6 - errorIds.length);

    const fullErrorItems = [...sliceItems, ...errorWords];
    fullErrorItems.sort((): number => {
      return randomInt(0, 100) > randomInt(0, 100) ? 1 : -1;
    });

    return fullErrorItems[randomInt(0, fullErrorItems.length - 1)];
  }

  setActiveTag(tag: string): void {
    this.activeTag = tag;
  }

  async toggleBreakInModel(learnMode: LearnModel, toggle): Promise<void> {
    learnMode.break = toggle;
    await this.dataAdapter.update(learnMode);
  }

  async upError(learnMode: LearnModel): Promise<void> {
    learnMode.countErrors++;
    await this.dataAdapter.update(learnMode);
  }

  async upRepeat(learnMode: LearnModel): Promise<void> {
    learnMode.countRepeat++;
    await this.dataAdapter.update(learnMode);
  }

  async upSuccess(learnMode: LearnModel): Promise<void> {
    learnMode.countSuccess++;
    await this.dataAdapter.update(learnMode);
  }
}
