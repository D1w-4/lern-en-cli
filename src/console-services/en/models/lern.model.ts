import { v4 as uuidv4 } from 'uuid';

export class LernModel {
  /**
   * пропуск модели
   */
  break = false;
  /**
   * создание наборов для изучения
   */
  tags: Array<string> = [];
  /**
   * Количество ошибок
   */
  countErrors = 0;
  /**
   * Количество повторений
   */
  countRepeat = 0;
  /**
   * Количество успешных попыток
   */
  countSuccess = 0;
  en: Array<string> = [];
  ru: Array<string> = [];
  id: string;
  constructor(lernData: any) {
    Object.assign(this, lernData);
    if (!this.id) {
      this.id = uuidv4();
    }

    this.ru = this.ru.map((word: string): string => {
      return word.toLowerCase();
    });

    this.en = this.en.map((word: string): string => {
      return word.toLowerCase();
    });
  }
}
