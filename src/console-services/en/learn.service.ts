import * as fs from 'fs';
import * as inquirer from 'inquirer';
import * as path from 'path';
import { DataAdapter } from './adapters/data.adapter';
import { FirebaseAdapter } from './adapters/firebase.adapter';
import { JsonFileAdapter } from './adapters/json-file.adapter';
import { audioService } from './audio.service';
import { ActiveTag, LearnCollection } from './models/learn.collection';
import { LearnModel } from './models/learn.model';
import { AbstractPracticMode } from './practic-mode/abstractPracticMode';
import { ChoicePMService } from './practic-mode/choicePM.service';
import { InputAndTranslatePMService } from './practic-mode/inputAndTranslatePM.service';
import { InputPMService } from './practic-mode/inputPM.service';
import { IChoices, TDirection } from './types';

const soundWords = require('./ultimate.json');
const promt = inquirer.createPromptModule();
promt.registerPrompt('filePath', require('inquirer-file-path'));

enum Action {
  addLearnModelToCollection = 'add_learn_model_to_collection',
  removeLearnModelCollection = 'remove_learn_model_collection',
  break = 'break',
  goBack = 'go_back',
  changeConfig = 'change_config',
  resetCurrentCollection = 'reset_current_collection'
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
          name: 'Сбросить текущую коллекцию',
          value: Action.resetCurrentCollection
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
          value: ActiveTag.new,
        },
        {
          name: 'Частые ошибки',
          value: ActiveTag.manyErrors,
        },
        {
          name: 'Мало повторялись',
          value: ActiveTag.fewRepeat,
        },
        ...tags,
      ],
      message: 'Набор слов',
    });

    if (tag === ActiveTag.new) {
      const result = await promt({
        type: 'input',
        name: 'tag',
        message: 'Название набора',
      });
      tag = result.tag;
    }

    return tag;
  }

  private async playAudio(learnModel: LearnModel): Promise<void> {
    for (const word of learnModel.en) {
      if (soundWords[word]) {
        const urlsList = [...soundWords[word]];
        const fn = (songUrl): Promise<void> => {
          return audioService.play(songUrl).catch(() => {
            return fn(urlsList.shift());
          });
        };
        await fn(urlsList.shift());
      }
    }
  }

  private async loopLearn(learnModel?: LearnModel): Promise<void> {
    console.clear();
    const { direction, learnCollection: collection } = this;
    learnModel = learnModel || collection.selectRandomLearnModel();
    if (!learnModel) {
      console.error('Слова кончились XD');
      return
    }
    const answerResult = await this.showQuestion(learnModel);

    if (typeof answerResult === 'boolean') {
      this.playAudio(learnModel);

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
      const newWordsList = await this.selectNewModels(collection.itemsByTag());
      newWordsList.forEach((learnModel) => {
        collection.addLearnModerTag(learnModel, collection.activeTag);
      });
    } else if (answerResult === Action.removeLearnModelCollection) {
      collection.removeLearnModerTag(learnModel, collection.activeTag);
    } else if (answerResult === Action.break) {
      collection.toggleBreakInModel(learnModel, true);
    } else if (answerResult === Action.changeConfig) {
      await this.setConfig();
    } else if(answerResult === Action.resetCurrentCollection) {
      const items = collection.itemsByTag();
      for(const item of items) {
        await collection.resetModel(item);
      }
    }

    await this.loopLearn();
  }

  private async selectNewModels(selectedItems?: Array<LearnModel>): Promise<Array<LearnModel>> {
    const collection = this.learnCollection;

    const learnModelList = collection.items.filter((learnModel: LearnModel): boolean => {
      return !learnModel.break;
    });

    const choices = learnModelList.map((learnModel, index): IChoices<number> => {
      return {
        name: `${learnModel.en.join(', ')} - ${learnModel.ru.join(', ')} | ${learnModel.tags.join(', ')}`,
        value: index,
        checked: !!selectedItems && selectedItems.some(selectedItem => selectedItem.id === learnModel.id)
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

    const { en } = await promt({
      type: 'input',
      name: 'en',
      message: 'en',
    });
    const enArr = en.split(',').map(s => s.trim());

    const isEn = enArr.some((word) => {
      return learnCollection.items.findIndex((learnModel: LearnModel) => {
        return learnModel.en.includes(word);
      }) !== -1;
    })

    if (isEn) {
      console.error(`"${en}" уже есть в наборе`);
      return await this.addWord(learnCollection);
    }

    const { ru } = await promt({
      type: 'input',
      name: 'ru',
      message: 'ru',
    });

    const ruArr = ru.split(',').map(s => s.trim());

    await learnCollection.addModel({
      en: enArr,
      ru: ruArr,
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
