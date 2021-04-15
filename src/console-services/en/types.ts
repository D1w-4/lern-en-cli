export type TPracticMode = 'input'|'input_translate'|'choice';
export type TDirection = {
  direction: string;
  reversDirection: string;
}

export interface IChoices<T> {
  name: string,
  value: T
}
