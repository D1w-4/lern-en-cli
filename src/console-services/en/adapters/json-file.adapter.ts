import * as fs from 'fs';
import { LearnModel } from '../models/learn.model';
import { DataAdapter } from './data.adapter';

export interface IJsonFileAdapterConfig {
  filePath: string;
  items: Array<LearnModel>
}

export class JsonFileAdapter extends DataAdapter {
  private filePath: string;
  private items: Array<LearnModel>;
  name = 'Файл JSON';
  init(config: IJsonFileAdapterConfig) {
    Object.assign(this, config);
  }

  async add(item: LearnModel): Promise<void> {
    this.items.push(item);
    return new Promise<void>((resolve, reject): void => {
      fs.writeFile(this.filePath, JSON.stringify(this.items, null, 4), (error) => {
        if (error) {
          reject(error);
          return;
        }
        this.items.push(item);
        resolve(void 0);
      });
    });
  }

  read(): Promise<Array<LearnModel>> {
    return new Promise<Array<LearnModel>>((resolve, reject): void => {
      fs.readFile(this.filePath, { encoding: 'utf-8' }, (error, data) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(JSON.parse(data));
      });
    });
  }

  async update(item: LearnModel): Promise<void> {
    const itemIndex = this.items.findIndex(s => s.id === item.id);
    this.items.splice(itemIndex, 1, item);
    return new Promise<void>((resolve, reject): void => {
      fs.writeFile(this.filePath, JSON.stringify(this.items, null, 4), (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(void 0);
      });
    });
  }

  async remove(item: LearnModel): Promise<void> {
    const itemIndex = this.items.findIndex(s => s.id === item.id);
    this.items.splice(itemIndex, 1);
    return new Promise<void>((resolve, reject): void => {
      fs.writeFile(this.filePath, JSON.stringify(this.items, null, 4), (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(void 0);
      });
    });
  }
}
