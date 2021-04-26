import { randomInt } from '../../../utils';
import { DataAdapter } from '../adapters/data.adapter';
import { LearnModel } from './learn.model';

export enum ActiveTag {
  new = 'new',
  manyErrors = 'many_errors',
  fewRepeat = 'few_repeat'
}
export class LearnCollection<TConfig> {
  activeTag: string | ActiveTag = '';
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
    this.items.push(learnModel);
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
    if (this.activeTag === ActiveTag.manyErrors) {
      return this.items.filter(learnModel => learnModel.countRepeat > 0 && learnModel.countErrors - learnModel.countSuccess > 0);
    }

    if (this.activeTag === ActiveTag.fewRepeat) {
      const mapRepeat = new Set<number>();
      this.items.forEach((learnModel) => {
        mapRepeat.add(learnModel.countRepeat);
      })
      const arrRepeat = Array.from(mapRepeat);
      arrRepeat.sort((a,b) => {
        return a > b ? 1 : -1;
      })
      const maxRepeat = Number(arrRepeat[Math.floor((arrRepeat.length / 100) * 30)]);
      console.log(`max repeat mode ${maxRepeat}`);
      return this.items.filter(learnModel => learnModel.countRepeat <= maxRepeat);
    }

    return this.items.filter(learnModel => learnModel.tags.includes(this.activeTag));
  }

  async removeLearnModerTag(learnModel: LearnModel, tag: string): Promise<void> {
    const id = learnModel.tags.findIndex(w => w === tag);
    learnModel.tags.splice(id, 1);
    await this.dataAdapter.update(learnModel);
  }

  selectRandomLearnModel(): LearnModel | undefined {
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
    });

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
    learnMode.lastRepeat = new Date().toUTCString();
    await this.dataAdapter.update(learnMode);
  }

  async upSuccess(learnMode: LearnModel): Promise<void> {
    learnMode.countSuccess++;
    await this.dataAdapter.update(learnMode);
  }

  async resetModel(learnModel: LearnModel): Promise<void> {
    learnModel.countRepeat = 0;
    learnModel.countErrors = 0;
    learnModel.countSuccess = 0;
    await this.dataAdapter.update(learnModel);
  }
}
