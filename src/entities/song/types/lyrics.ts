/** Часть песни по разметке [Куплет], [Припев]: строка в скобках - заголовок части */
export interface LyricsPart {
  title: string;
  lines: string[];
}

/** Текст в поле ввода и выделение в нём */
export interface TextEdit {
  value: string;
  start: number;
  end: number;
}
