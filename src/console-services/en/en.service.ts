import * as inquirer from 'inquirer';
import { Command, Console } from 'nestjs-console';
import * as translate from 'translate';
import { randomInt } from '../../utils';
import { LernCollection } from './models/lern.collection';
import { LernModel } from './models/lern.model';
const { Worker } = require('worker_threads')
const spawn = require('child_process').exec;
translate.engine = 'libre';

function runService(workerData) {
   spawn(`node ./test.js ${workerData}`);
}

const promt = inquirer.createPromptModule();

interface Ichoices<T> {
  name: string,
  value: T
}

type TpracticMode = 'input'|'input_translate'|'choice';
type Tdirection = {
  direction: string;
  reversDirection: string;
}

interface ILoopLernConfig {
  collection: LernCollection;
  direction: Tdirection;
  practicMode: TpracticMode;
}

enum Action {
  addLernModelToCollection = 'add_lern_model_to_collection',
  removeLernModelCollection = 'remove_lern_model_collection',
  break = 'break',
  goBack = 'go_back',
  changeConfig = 'change_config'
}

// yarn console:dev en lern ./book.json
@Console({
  name: 'en',
  description: 'Учить',
})
export class En2Service {

  async action(answer): Promise<Action> {
    if (!['[', '~'].includes(answer)) {
      return;
    }
    const { action } = await promt({
      type: 'list',
      name: 'action',
      choices: [
        {
          name: 'Добавить новое слово в коллецию',
          value: Action.addLernModelToCollection,
        },
        {
          name: 'Удалить из коллецию',
          value: Action.removeLernModelCollection,
        },
        {
          name: 'Изменить конфигурацию',
          value: Action.changeConfig,
        },
        {
          name: 'Забыть',
          value: Action.break,
        },
        {
          name: 'Назад',
          value: Action.goBack,
        },
      ],
      message: 'Настройки',
    });

    return action;
  }

  async checkLernModelList(collection: LernCollection): Promise<Array<LernModel>> {
    const lernModelList = collection.items.filter((lernModel: LernModel): boolean => {
      return !lernModel.break && !lernModel.tags.includes(collection.activeTag);
    });
    const choices = lernModelList.map((lernModel, index): Ichoices<number> => {
      return {
        name: `${lernModel.en.join(', ')} - ${lernModel.ru.join(', ')}`,
        value: index,
      };
    });
    const { nextWordList } = await promt({
      type: 'checkbox',
      name: 'nextWordList',
      choices,
      message: 'Слова для набора',
    });

    return nextWordList.map((index: number) => lernModelList[index]);
  }

  async choiceTag(lernCollection: LernCollection): Promise<string> {
    const tags = lernCollection.getTags().map(tag => {
      return {
        name: tag,
        value: tag,
      };
    });
    let { tag } = await promt({
      type: 'list',
      name: 'tag',
      choices: [
        {
          name: 'Новый набор слов',
          value: 'new',
        },
        ...tags,
      ],
      message: 'Набор слов',
    });

    if (tag === 'new') {
      const result = await promt({
        type: 'input',
        name: 'tag',
        message: 'Название набора',
      });
      tag = result.tag;
    }

    return tag;
  }

  @Command({
    command: 'lern <filePath>',
    description: '',
  })
  async lern(filePath: string) {
    const collection = new LernCollection(filePath);
    collection.setActiveTag(
      await this.choiceTag(collection),
    );
    if (!collection.itemsByTag().length) {
      const newWordsList = await this.checkLernModelList(collection);
      newWordsList.forEach((lernModel) => {
        collection.addLernModerTag(lernModel, collection.activeTag);
      });
    }
    const config = await this.setConfig(collection);

    await this.loopLern(config);
  }

  async loopLern(config: ILoopLernConfig, lernModel?: LernModel): Promise<void> {
    console.clear();
    lernModel = lernModel || config.collection.selectRandomLernModel();
    const answerResult = await this.showQuestion(config, lernModel);
    if (typeof answerResult === 'boolean') {
      if (answerResult) {
        config.collection.upSuccess(lernModel);
        config.collection.upRepeat(lernModel);
      } else {
        config.collection.upError(lernModel);
        config.collection.upRepeat(lernModel);
        const { repeat } = await promt({
          type: 'list',
          name: 'repeat',
          choices: [
            {
              name: 'повторить',
              value: true,
            },
            {
              name: 'ok',
              value: false,
            },
          ],
          message: `${lernModel[config.direction.direction].join(', ')} !== ${answerResult} | ${lernModel[config.direction.reversDirection].join(
            ', ')}`,
        });
        if (repeat) {
          await this.loopLern(config, lernModel);
          return;
        }
      }
    } else if (answerResult === Action.addLernModelToCollection) {
      const newWordsList = await this.checkLernModelList(config.collection);
      newWordsList.forEach((lernModel) => {
        config.collection.addLernModerTag(lernModel, config.collection.activeTag);
      });
    } else if (answerResult === Action.removeLernModelCollection) {
      config.collection.removeLernModerTag(lernModel, config.collection.activeTag);
    } else if (answerResult === Action.break) {
      config.collection.toggleBreakInModel(lernModel, true);
    } else if (answerResult === Action.changeConfig) {
      config = await this.setConfig(config.collection, config);
    }

    await this.loopLern(config);
  }

  async selectPracticMode(): Promise<TpracticMode> {
    const { mode } = await promt({
      type: 'list',
      name: 'mode',
      choices: [
        {
          name: 'напечатать',
          value: 'input',
        },
        {
          name: 'напечатать + перевод',
          value: 'input_translate',
        },
        {
          name: 'выбрать из списка',
          value: 'choice',
        },
      ],
      message: 'Режим тренировки',
    });

    return mode as TpracticMode;
  }

  async selectTranslateDirection(): Promise<Tdirection> {
    const { defaultDirection } = await promt({
      type: 'list',
      name: 'defaultDirection',
      choices: [
        {
          name: 'en-ru',
          value: 'en',
        },
        {
          name: 'ru-en',
          value: 'ru',
        },
      ],
      message: 'Направление перевода',
    });

    return {
      direction: defaultDirection,
      reversDirection: defaultDirection === 'en' ? 'ru' : 'en',
    };
  }

  async setConfig(collection: LernCollection, config?: ILoopLernConfig): Promise<ILoopLernConfig> {
    const direction = await this.selectTranslateDirection();
    const practicMode = await this.selectPracticMode();

    return Object.assign(config || {}, {
      collection,
      direction,
      practicMode,
    });
  }

  async showQuestion(config: ILoopLernConfig, lernModel: LernModel): Promise<boolean|Action> {
    const { direction, practicMode } = config;
    const directionWord = lernModel[direction.direction];
    const reversDirectionWord = lernModel[direction.reversDirection];
    if (practicMode === 'input') {
      const { answer } = await promt({
        type: 'input',
        name: 'answer',
        message: `${direction.direction} ${directionWord.join(', ')}`,
      });

      const action = await this.action(answer);
      if (action === Action.goBack) {
        return await this.showQuestion(config, lernModel);
      }
      if (Object.values(Action).includes(action)) {
        return action;
      }

      if (reversDirectionWord.includes(answer)) {
        runService(`https://poliglot16.ru/audio/verbs/${answer}.mp3`);
        return true;
      } else {
        runService(`https://poliglot16.ru/audio/verbs/${reversDirectionWord[0]}.mp3`);
        return false;
      }
    }

    if (practicMode === 'input_translate') {
      const { answer } = await promt({
        type: 'input',
        name: 'answer',
        message: `${direction.reversDirection}==${direction.direction} | ${directionWord.join(', ')}`,
      });

      const action = await this.action(answer);
      if (action === Action.goBack) {
        return await this.showQuestion(config, lernModel);
      }
      if (Object.values(Action).includes(action)) {
        return action;
      }

      const splitAnswer = answer.toLowerCase().split('==');

      if (reversDirectionWord.includes(splitAnswer[0]) && directionWord.includes(splitAnswer[1])) {
        return true;
      } else {
        return false;
      }
    }

    if (practicMode === 'choice') {
      const randomCollection = [...config.collection.items];
      randomCollection.sort(() => {
        return randomInt(0, 100) > randomInt(0, 100) ? 1 : -1;
      });
      const choceCollection = [
        ...randomCollection.filter(item => item.id !== lernModel.id).slice(0, 3),
        lernModel,
      ].reduce((acc, value) => {
        acc.push({
          name: value[direction.reversDirection].join(', '),
          value: value[direction.reversDirection].join(', '),
        });
        return acc;
      }, []);
      const { answer } = await promt({
        type: 'list',
        name: 'answer',
        message: `${direction} ${directionWord}`,
        choices: [
          ...choceCollection,
          { name: 'Настройки', value: '~' }
        ],
      });

      const action = await this.action(answer);
      if (action === Action.goBack) {
        return await this.showQuestion(config, lernModel);
      }
      if (Object.values(Action).includes(action)) {
        return action;
      }

      if (reversDirectionWord.join(', ') === answer) {
        runService(`https://poliglot16.ru/audio/verbs/${reversDirectionWord[0]}.mp3`);
        return true;
      } else {
        runService(`https://poliglot16.ru/audio/verbs/${reversDirectionWord[0]}.mp3`);
        return false;
      }
    }

    return false;
  }
  @Command({
    command: 'add <filePath> <en> <ru>',
    description: 'добавить слово',
  })
  add(filePath, en, ru): void {
    const collection = new LernCollection(filePath);
    const isset = collection.items.some((s) => s.en.includes(en));
    if (isset) {
      console.log(`Уже есть ${en}`);
      return;
    }
    collection.addModel({ en: en.split(','), ru: ru.split(',') })
  }
}
