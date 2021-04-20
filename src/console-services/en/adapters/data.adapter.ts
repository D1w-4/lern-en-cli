import { LearnModel } from '../models/learn.model';

export abstract class DataAdapter {
  abstract name: string;
  abstract read(): Promise<Array<LearnModel>>;
  abstract add(item: LearnModel): Promise<void>;
  abstract update(item: LearnModel): Promise<void>;
  abstract remove(item: LearnModel): Promise<void>
  abstract init(...args:any[]): void;
}
