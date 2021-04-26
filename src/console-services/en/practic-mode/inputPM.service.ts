import * as inquirer from 'inquirer';
import { LearnModel } from '../models/learn.model';
import { TDirection } from '../types';
import { AbstractPracticMode } from './abstractPracticMode';

const promt = inquirer.createPromptModule();

export class InputPMService extends AbstractPracticMode {
  name = 'напечатать';

  async ask(direction: TDirection, learnModel: LearnModel): Promise<string> {
    const directionWord = learnModel[direction.direction].join(', ');
    const { answer } = await promt({
      type: 'input',
      name: 'answer',
      message: `S:${learnModel.countSuccess} E:${learnModel.countErrors} R: ${learnModel.countRepeat}
${direction.direction} ${directionWord}`,
    });

    return answer;
  }

  checkAnswer(direction: TDirection, learnModel: LearnModel, answer: string): boolean {
    const answerList = AbstractPracticMode.prepareAnswer(answer);
    const reversDirectionWord = learnModel[direction.reversDirection];
    return answerList.every(word => {
      return reversDirectionWord.includes(word);
    });
  }
}
