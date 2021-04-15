import * as inquirer from 'inquirer';
import { LearnModel } from '../models/learn.model';
import { TDirection } from '../types';
import { AbstractPracticMode } from './abstractPracticMode';
import { randomInt } from '../../../utils';

const promt = inquirer.createPromptModule();

export class ChoicePMService extends AbstractPracticMode {
  name = 'выбрать';

  async ask(direction: TDirection, learnModel: LearnModel, items: Array<LearnModel>): Promise<string> {
    const randomCollection = [...items];
    randomCollection.sort(() => {
      return randomInt(0, 100) > randomInt(0, 100) ? 1 : -1;
    });
    const choceCollection = [
      ...randomCollection.filter(item => item.id !== learnModel.id).slice(0, 3),
      learnModel,
    ].reduce((acc, value) => {
      acc.push({
        name: value[direction.reversDirection].join(', '),
        value: value[direction.reversDirection].join(', '),
      });
      return acc;
    }, []);

    const directionWord = learnModel[direction.direction].join(', ');
    const { answer } = await promt({
      type: 'list',
      name: 'answer',
      message: `${direction} ${directionWord}`,
      choices: [
        ...choceCollection,
        { name: 'Настройки', value: '~' }
      ],
    });

    return answer;
  }

  checkAnswer(direction: TDirection, learnModel: LearnModel, answer: string): boolean {
    const reversDirectionWord = learnModel[direction.reversDirection];

    return reversDirectionWord.join(', ') === answer;
  }
}
