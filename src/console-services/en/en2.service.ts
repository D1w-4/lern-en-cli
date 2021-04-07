import * as clipboardy from 'clipboardy';
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import { Command, Console } from 'nestjs-console';
import * as translate from 'translate';

translate.engine = 'libre';

const promt = inquirer.createPromptModule();

function randomInteger(min: number, max: number): number {
  const rand = min - 0.5 + Math.random() * (max - min + 1
  );
  return Math.round(rand);
}

class WordModel {
  break? = false;
  byDayCollection?: number;
  countErrors? = 0;
  countLerning? = 0;
  countSuccess? = 0;
  en: Array<string> = [];
  phonetics? = '';
  rating? = 0;
  repeat?: number = 0;
  ru?: Array<string> = [];

  constructor(data: WordModel) {
    Object.assign(this, data);
  }

}

interface IlernFNParams {
  byDayCollection?: number;
  defaultDirection: string;
  filePath: string;
  mode?: string;
  repeatDirection?: string;
  repeatWord?: WordModel;
  wordCollection: Array<WordModel>;
}

interface Ichoices<T> {
  name: string,
  value: T
}

// yarn console:dev en lern ./book.json
@Console({
  name: 'en',
  description: 'Учить',
})
export class En2Service {
  private async lernFN(conf: IlernFNParams): Promise<void> {
    const {
      defaultDirection,
      repeatDirection,
      wordCollection,
      repeatWord,
      byDayCollection,
      mode,
      filePath,
    } = conf;

    console.clear();
    let direction = defaultDirection;
    if (repeatDirection) {
      direction = repeatDirection;
    } else {
      if (defaultDirection === 'random') {
        direction = ['ru', 'en'][randomInteger(0, 1)];
      }
    }

    const reversDirection = direction === 'ru' ? 'en' : 'ru';

    const filteringByDateCollection = wordCollection.filter((word: WordModel) => {
      return word.byDayCollection === byDayCollection;
    });
    const word = repeatWord || this.selectWord(filteringByDateCollection);
    let currentWord = word[direction].join(', ');

    let currentWordTrans = '';
    if (currentWord) {
      clipboardy.writeSync(currentWord);
      if (!word[reversDirection].length) {
        currentWordTrans = await translate(word[direction].join(', '), { from: direction, to: reversDirection });
      }
    } else {
      currentWord = await translate(word[reversDirection].join(', '), { from: reversDirection, to: direction });
    }

    let answer = '';
    if (mode === 'input') {
      const result = await promt({
        type: 'input',
        name: 'answer',
        message: `${direction} ${currentWord} ${!word[reversDirection].length ? currentWordTrans : ''}`,
      });
      answer = result.answer;
    }

    if (mode === 'input_translate') {
      const result = await promt({
        type: 'input',
        name: 'answer',
        message: `${reversDirection}==${direction} ${currentWord} ${!word[reversDirection].length ? currentWordTrans :
                                                                    ''}`,
      });
      answer = result.answer;
    }
    if (mode === 'choice') {
      filteringByDateCollection.sort(() => {
        return randomInteger(0, 100) > randomInteger(0, 100) ? 1 : -1;
      });
      let choceCollection = [
        ...wordCollection.slice(0, 3),
        word,
      ];
      choceCollection = [
        ...choceCollection,
        ...filteringByDateCollection.slice(0, 2).filter(w => w.en[0] !== word.en[0]),
      ];
      const result = await promt({
        type: 'list',
        name: 'answer',
        message: `${direction} ${currentWord} ${!word[reversDirection].length ? currentWordTrans : ''}`,
        choices: choceCollection.reduce((acc, value) => {
          acc.push({
            name: value[reversDirection].join(', '),
            value: value[reversDirection].join(', '),
          });
          return acc;
        }, []),
      });
      answer = result.answer;
    }

    if (['~', '['].includes(answer)) {
      const editor = await promt({
        type: 'list',
        name: 'data',
        choices: [
          {
            name: 'Добавить новое слово в коллецию',
            value: 'addWordToByDateCollection',
          },
          {
            name: 'Удалить из коллецию',
            value: 'removeByDateCollection',
          },
          {
            name: 'Добавить перевод',
            value: 'addTranslate',
          },
          {
            name: 'Забыть',
            value: 'break',
          },
          {
            name: 'Назад',
            value: 'go_back',
          },
        ],
        message: 'Настройки',
      });

      if (editor.data === 'removeByDateCollection') {
        wordCollection.some(removeWord => {
          if (word.en.join('') === removeWord.en.join('')) {
            removeWord.byDayCollection = undefined;
            return true;
          }
        });
        fs.writeFileSync(filePath, JSON.stringify(wordCollection, null, 4));
        await this.lernFN(Object.assign(conf, {
          wordCollection,
          repeatWord: void 0,
        }));
        return;
      }
      if (editor.data === 'addTranslate') {
        const data = await promt({
          type: 'input',
          name: 'translate',
          message: `Перевод | ${reversDirection}  |(${word[reversDirection].join(', ')})`,
        });
        word[reversDirection].push(data.translate);
      }
      if (editor.data === 'addWordToByDateCollection') {
        const filteredWordCollection = wordCollection.filter((word: WordModel) => {
          return !word.byDayCollection;
        });
        const allWordList: Array<Ichoices<number>> = filteredWordCollection
          .map((
            word: WordModel,
            index: number,
          ): Ichoices<number> => {

            return {
              name: `${word.en.join(', ')} - ${word.ru.join(',')}`,
              value: index,
            };
          });
        const { nextWordList } = await promt({
          type: 'checkbox',
          name: 'nextWordList',
          choices: allWordList,
          message: 'Слова для нового набора',
        });
        nextWordList.forEach((index: number) => {
          if (filteredWordCollection[index]) {
            filteredWordCollection[index].byDayCollection = byDayCollection;
          }
        });
        fs.writeFileSync(filePath, JSON.stringify(wordCollection, null, 4));
      }

      if (editor.data === 'break') {
        word.break = true;
      }
    }

    if (!word[reversDirection].length) {
      const { add } = await promt({
        type: 'list',
        name: 'add',
        choices: [
          {
            name: 'Добавить',
            value: true,
          },
          {
            name: 'Далее',
            value: false,
          },
        ],
        message: `Добавить | ${answer} | (${word[direction]}) ?`,
      });
      if (add === true) {
        answer.split(',').forEach((str) => {
          word[reversDirection].push(str.trim().toLowerCase());
        });
      }
    }
    word.countLerning++;

    const [wReverseDirection = '', wDirection = ''] = answer.split('==');
    const isTrueDirection = word[direction].map(s => s.toLowerCase()).includes(wDirection.toLowerCase());
    const isTrueReverseDirection = word[reversDirection].map(s => s.toLowerCase())
                                                        .includes(wReverseDirection.toLowerCase());

    if (mode === 'input_translate' && isTrueDirection && isTrueReverseDirection) {
      word.countSuccess++;
    } else if (mode === 'input' && isTrueReverseDirection) {
      word.countSuccess++;
    } else if (mode === 'choice' && isTrueReverseDirection) {
      word.countSuccess++;
    } else {
      word.countErrors++;
      word.repeat = 1;
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
        message: `!! "${answer}" | ${word[direction].join(', ')} | ${word[reversDirection].join(', ')}`,
      });
      if (repeat) {
        fs.writeFileSync(filePath, JSON.stringify(wordCollection, null, 4));
        await this.lernFN(Object.assign(conf, {
          repeatWord: word,
          repeatDirection: direction,
        }));
        return;
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(wordCollection, null, 4));
    if (word.repeat) {
      word.repeat--;
      fs.writeFileSync(filePath, JSON.stringify(wordCollection, null, 4));
      await this.lernFN(
        Object.assign(conf, {
          repeatWord: word,
        }),
      );
      return;
    } else {
      await this.lernFN(
        Object.assign(conf, { repeatWord: void 0 }),
      );
      return;
    }

    return;
  }

  private selectWord(file: Array<WordModel>): WordModel {
    const errorWords = file.filter(word => {
      return word.countErrors - word.countSuccess > 0;
    });
    if (errorWords.length >= 5) {
      return errorWords[randomInteger(0, errorWords.length - 1)];
    } else {
      const sortFile = [...file];
      sortFile.sort((a, b) => {
        return a.countLerning < b.countLerning ? -1 : 1;
      });
      const sliceSortFile = sortFile.slice(0, 5);
      return sliceSortFile[randomInteger(0, sliceSortFile.length - 1)];
    }
  }

  @Command({
    command: 'add <filePath> <en> <ru>',
    description: 'добавить слово',
  })
  add(filePath, en, ru): void {
    const word = new WordModel({ en: [en], ru: [ru] });
    word.repeat = 3;
    let file = '[]';
    if (fs.existsSync(filePath)) {
      file = fs.readFileSync(filePath, { encoding: 'utf-8' });
    }
    const data = JSON.parse(file);
    const isset = data.some((s) => s.en === en);
    if (isset) {
      console.log(`Уже есть ${en}`);
      return;
    }
    data.push(word);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
  }

  @Command({
    command: 'lern <filePath>',
    description: '',
  })
  async lern(filePath: string) {
    const date = new Date();
    const wordsLernDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

    const file = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf-8' }));
    const wordCollection = file.filter((word) => {
      return !word.break;
    });

    const daysCollection = {};

    wordCollection.forEach((word) => {
      if (word.byDayCollection) {
        if (!(word.byDayCollection in daysCollection
        )) {
          daysCollection[word.byDayCollection] = 0;
        }
        daysCollection[word.byDayCollection]++;
      }
    });

    const dateCollection: Array<Ichoices<number>> = Object
      .entries(daysCollection)
      .reduce<Array<Ichoices<number>>>((
        acc: Array<Ichoices<number>>,
        [value, count]: [string, number],
      ): Array<Ichoices<number>> => {
        const wordDate = new Date(Number(value));
        acc.push({
          name: `${wordDate.getDate()}.${wordDate.getMonth() + 1}.${wordDate.getFullYear()} (${count})`,
          value: Number(value),
        });

        return acc;
      }, []);

    const { selectByDateCollection } = await promt({
      type: 'list',
      name: 'selectByDateCollection',
      choices: [
        {
          name: 'Новый набор слов',
          value: 'new',
        },
        ...dateCollection,
      ],
      message: 'Набор слов',
    });

    if (selectByDateCollection === 'new') {
      const filteredWordCollection = wordCollection.filter((word: WordModel) => {
        return !word.byDayCollection;
      });
      const allWordList: Array<Ichoices<number>> = filteredWordCollection
        .map((
          word: WordModel,
          index: number,
        ): Ichoices<number> => {

          return {
            name: `${word.en.join(', ')} - ${word.ru.join(',')}`,
            value: index,
          };
        });
      const { nextWordList } = await promt({
        type: 'checkbox',
        name: 'nextWordList',
        choices: allWordList,
        message: 'Слова для нового набора',
      });
      nextWordList.forEach((index: number) => {
        if (filteredWordCollection[index]) {
          filteredWordCollection[index].byDayCollection = wordsLernDate;
        }
      });
      fs.writeFileSync(filePath, JSON.stringify(wordCollection, null, 4));
    }

    const { defaultDirection } = await promt({
      type: 'list',
      name: 'defaultDirection',
      choices: [
        {
          name: 'en',
          value: 'en',
        },
        {
          name: 'ru',
          value: 'ru',
        },
        {
          name: 'random',
          value: 'random',
        },
      ],
      message: 'Направление перевода',
    });

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
      message: 'Режим?',
    });

    await this.lernFN({
      wordCollection,
      defaultDirection,
      byDayCollection: selectByDateCollection === 'new' ? wordsLernDate : selectByDateCollection,
      mode,
      filePath,
    });
  }

  //  yarn console:dev en parse -f /Users/d1w.4/job/test/en/book.txt -p ./book.json
  @Command({
    command: 'parse',
    description: 'парсинг en текста',
    options: [
      {
        flags: '-f, --filePath <filePath>',
        description: 'Файл для сохранения JSON результатов',
      },
      {
        flags: '-p, --savePath <savePath>',
        description: 'Путь сохранения',
      },
    ],
  })
  parse({ filePath, savePath }) {
    const file = fs.readFileSync(filePath, { encoding: 'utf-8' });
    const chunk = file.split(/\W+/).map((word) => {
      return word.toLowerCase();
    });
    const dict = {};
    chunk.forEach((word) => {
      if (dict[word]) {
        dict[word]++;
      } else {
        dict[word] = 1;
      }
    });
    const resultCol = Object.entries(dict).map(([word, count]: [string, number]) => {
      return new WordModel({ en: [word], rating: count });
    });
    resultCol.sort((a, b) => {
      return a.rating <= b.rating ? 1 : -1;
    });
    fs.writeFileSync(savePath, JSON.stringify(resultCol, null, 4));
  }

  @Command({
    command: 'test <filePath> <errorPath> <successPath>',
    description: '',
  })
  async test(filePath, errorPath, successPath) {
    const file = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf-8' }));
    const errorWordsCollection = [];
    const successWordsCollection = [];
    let wordIndex = 0;
    let countTrue = 0;
    let countFalse = 0;
    const cicle = async (word: WordModel) => {
      const { answer } = await promt({
        type: 'input',
        name: 'answer',
        message: `true:${countTrue} | false: ${countFalse} | ${word.ru.join(', ')}`,
      });
      const hastTrueTranslate = word.en.some((w) => {
        return w.toLowerCase() === answer.toLowerCase();
      });
      if (hastTrueTranslate) {
        countTrue++;
        successWordsCollection.push(word);
        fs.writeFileSync(successPath, JSON.stringify(successWordsCollection, null, 4));
      } else {
        console.error(`${word.en.join(', ')} | ${word.ru.join(', ')}`);
        countFalse++;
        errorWordsCollection.push(word);
        fs.writeFileSync(errorPath, JSON.stringify(errorWordsCollection, null, 4));
      }
      wordIndex++;
      await cicle(file[wordIndex]);
    };
    await cicle(file[0]);
  }
}
