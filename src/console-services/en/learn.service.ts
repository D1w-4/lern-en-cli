import * as inquirer from 'inquirer';
import { DataAdapter } from './adapters/data.adapter';
import { FirebaseAdapter } from './adapters/firebase.adapter';
import { JsonFileAdapter } from './adapters/json-file.adapter';
import { LearnCollection } from './models/learn.collection';
import { LearnModel } from './models/learn.model';
import { AbstractPracticMode } from './practic-mode/abstractPracticMode';
import { ChoicePMService } from './practic-mode/choicePM.service';
import { InputAndTranslatePMService } from './practic-mode/inputAndTranslatePM.service';
import { InputPMService } from './practic-mode/inputPM.service';
import { IChoices, TDirection } from './types';
import * as fs from 'fs';
import * as path from 'path';

const soundWords = require('./ultimate.json');
const promt = inquirer.createPromptModule();
promt.registerPrompt('filePath', require('inquirer-file-path'));
const spawn = require('child_process').exec;

function runService(workerData: Array<string>) {
  spawn(`node ./test.js -- ${workerData.join(' ')}`);
}

enum Action {
  addLearnModelToCollection = 'add_learn_model_to_collection',
  removeLearnModelCollection = 'remove_learn_model_collection',
  break = 'break',
  goBack = 'go_back',
  changeConfig = 'change_config'
}

export class LearnService {
  dataAdapterList: Array<any> = [
    new JsonFileAdapter(),
    new FirebaseAdapter(),
  ];
  direction: TDirection;
  learnCollection: LearnCollection<unknown>;
  practicMode: AbstractPracticMode;
  practicModeList: Array<AbstractPracticMode> = [
    new InputPMService(),
    new InputAndTranslatePMService(),
    new ChoicePMService(),
  ];

  private async action(answer): Promise<Action> {
    if (!['[', '~'].includes(answer)) {
      return;
    }
    const { action } = await promt({
      type: 'list',
      name: 'action',
      choices: [
        {
          name: 'Добавить новое слово в коллецию',
          value: Action.addLearnModelToCollection,
        },
        {
          name: 'Удалить из коллецию',
          value: Action.removeLearnModelCollection,
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

  private async choiceTag(): Promise<string> {
    const tags = this.learnCollection.getTags().map(tag => {
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

  private async loopLearn(learnModel?: LearnModel): Promise<void> {
    // console.clear();
    const { direction, learnCollection: collection } = this;
    learnModel = learnModel || collection.selectRandomLearnModel();
    const answerResult = await this.showQuestion(learnModel);
    if (typeof answerResult === 'boolean') {
      if (soundWords[learnModel.en[0]]) {
        runService(soundWords[learnModel.en[0]]);
      }
      if (soundWords[learnModel.en[1]]) {
        setTimeout(() => {
          runService(soundWords[learnModel.en[1]]);
        }, 1000);
      }
      if (answerResult) {
        collection.upSuccess(learnModel);
        collection.upRepeat(learnModel);
      } else {
        collection.upError(learnModel);
        collection.upRepeat(learnModel);
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
          message: `${learnModel[direction.direction].join(', ')} !== ${answerResult} | ${learnModel[direction.reversDirection].join(
            ', ')}`,
        });
        if (repeat) {
          await this.loopLearn(learnModel);
          return;
        }
      }
    } else if (answerResult === Action.addLearnModelToCollection) {
      const newWordsList = await this.selectNewModels();
      newWordsList.forEach((learnModel) => {
        collection.addLearnModerTag(learnModel, collection.activeTag);
      });
    } else if (answerResult === Action.removeLearnModelCollection) {
      collection.removeLearnModerTag(learnModel, collection.activeTag);
    } else if (answerResult === Action.break) {
      collection.toggleBreakInModel(learnModel, true);
    } else if (answerResult === Action.changeConfig) {
      await this.setConfig();
    }

    await this.loopLearn();
  }

  private async selectNewModels(): Promise<Array<LearnModel>> {
    const collection = this.learnCollection;

    const learnModelList = collection.items.filter((learnModel: LearnModel): boolean => {
      return !learnModel.break && !learnModel.tags.includes(collection.activeTag);
    });
    const choices = learnModelList.map((learnModel, index): IChoices<number> => {
      return {
        name: `${learnModel.en.join(', ')} - ${learnModel.ru.join(', ')}`,
        value: index,
      };
    });
    const { nextWordList } = await promt({
      type: 'checkbox',
      name: 'nextWordList',
      choices,
      message: 'Слова для набора',
    });

    return nextWordList.map((index: number) => learnModelList[index]);
  }

  private async selectPracticMode(): Promise<AbstractPracticMode> {
    const choiseList = this.practicModeList.map(cl => {
      return {
        name: cl.name,
        value: cl,
      };
    });

    const { mode } = await promt({
      type: 'list',
      name: 'mode',
      choices: choiseList,
      message: 'Режим тренировки',
    });

    return mode as AbstractPracticMode;
  }

  private async selectTranslateDirection(): Promise<TDirection> {
    const { defaulTDirection } = await promt({
      type: 'list',
      name: 'defaulTDirection',
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
      direction: defaulTDirection,
      reversDirection: defaulTDirection === 'en' ? 'ru' : 'en',
    };
  }

  private async setConfig(): Promise<void> {
    this.direction = await this.selectTranslateDirection();
    this.practicMode = await this.selectPracticMode();
  }

  private async showQuestion(learnModel: LearnModel): Promise<boolean|Action> {
    const answer = await this.practicMode.ask(
      this.direction,
      learnModel,
      this.learnCollection.items,
    );
    const action = await this.action(answer);
    if (action === Action.goBack) {
      return await this.showQuestion(learnModel);
    }
    if (Object.values(Action).includes(action)) {
      return action;
    }
    return this.practicMode.checkAnswer(this.direction, learnModel, answer);
  }

  async addWord(
    learnCollection?: LearnCollection<LearnModel>,
  ): Promise<void> {
    if (!learnCollection) {
      const adapter = await this.choiceAdapter();
      learnCollection = new LearnCollection(adapter);
      await learnCollection.init();
    }

    const {en} = await promt({
      type: 'input',
      name: 'en',
      message: 'en',
    });

    const {ru} = await promt({
      type: 'input',
      name: 'ru',
      message: 'ru',
    });

    await learnCollection.addModel({
      en: en.split(',').map(s => s.trim()),
      ru: ru.split(',').map(s => s.trim())
    });
    await this.addWord(learnCollection);
  }

  async choiceAdapter(): Promise<DataAdapter> {
    const choiseList = this.dataAdapterList.map((adapter) => {
      return {
        name: adapter.name,
        value: adapter,
      };
    });
    const { adapter } = await promt({
      type: 'list',
      name: 'adapter',
      choices: choiseList,
      message: 'Где хранить слова?',
    });

    if (adapter instanceof JsonFileAdapter) {
      const { filePath } = await promt({
        type: 'filePath',
        name: 'filePath',
        message: 'Выбери файл .json',
        basePath: './',
      });

      adapter.init({ filePath, items: [] });
    }

    if (adapter instanceof FirebaseAdapter) {
      let filePath = path.resolve(process.cwd(), 'firebase.config.json');
      if (!fs.existsSync(filePath)) {
        const { choicePath } = await promt({
          type: 'filePath',
          name: 'choicePath',
          message: 'Выбери конфиг файл firebase .json',
          basePath: './',
        });
        filePath = choicePath;
      }

      adapter.init({ filePath });
    }
    return adapter;
  }

  async run(): Promise<void> {
    const adapter = await this.choiceAdapter();

    this.learnCollection = new LearnCollection(adapter);
    await this.learnCollection.init();

    const collection = this.learnCollection;
    collection.setActiveTag(
      await this.choiceTag(),
    );
    if (!collection.itemsByTag().length) {
      const newWordsList = await this.selectNewModels();
      newWordsList.forEach((learnModel) => {
        collection.addLearnModerTag(learnModel, collection.activeTag);
      });
    }

    await this.setConfig();

    await this.loopLearn();
  }
}
