import { LearnModel } from '../models/learn.model';
import { TDirection } from '../types';

export abstract class AbstractPracticMode {
  abstract name: string;
  static prepareAnswer(answer: string): Array<string> {
    return answer.split(',').map(s => s.toLowerCase().trim());
  }
  abstract async ask(direction: TDirection, learnModel: LearnModel, items: Array<LearnModel>): Promise<string>
  abstract checkAnswer(direction: TDirection, learnModel: LearnModel, answer: string): boolean;
}
