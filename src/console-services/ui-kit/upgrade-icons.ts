import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { extname, join, resolve } from 'path';
import { Linter, Configuration } from 'tslint';

const LIB_NAME = '@tochka-modules/t15-ui-kit-icons';

/**
 * Это директории в которые ненужно залезать
 */
const EXCLUDE = ['.git', '.idea', '.vscode', 'node_modules', 'build', 'dist', 'bin'];

/**
 * Получаем все TS и TSX файлы в директории
 * @param dirPath
 */
const getComponents = (dirPath: string): string[] => readdirSync(dirPath)
  .filter(item => !EXCLUDE.includes(item))
  .map(item => join(dirPath, item))
  .reduce((files: string[], item: string) => files.concat(statSync(item).isDirectory() ? getComponents(item) : item), [])
  .filter(file => /^\.(tsx?)$/gim.test(extname(file)));

/**
 * Проверяем код на наличие старых импортов иконок
 * @param code
 */
const codeWithIcon = (code: string): boolean =>
  // Иконки из UI Kit v1
  /@tochka-modules\/t15-ui-kit\/icons/gim.test(code) ||
  // Иконки из UI Kit v2
  /@t15-ui-kit\/icons/gim.test(code);

/**
 * Проверяем директорию на наличие tsconfig.json
 * @param dirPath
 */
const dirWithTSConfig = (dirPath: string): boolean => existsSync(resolve(dirPath, 'tsconfig.json'));

/**
 * Получаем директорию в которой находится tsconfig.json или возвращает undefined
 * @param path
 */
function getRulesDirectory(path: string): string | undefined {
  let lastPath = '';
  let result;

  while (path !== lastPath && !result) {
    if (dirWithTSConfig(path)) {
      result = path;
    }

    lastPath = path;
    path = resolve(path, '..');
  }

  return result;
}

export function upgradeIcons(): void {
  const rootDirPath = process.cwd();
  const rulesDirectory = getRulesDirectory(rootDirPath);

  getComponents(rootDirPath)
    .forEach(component => {
      const code = readFileSync(component, 'utf8');

      if (codeWithIcon(code)) {
        const newCode = code
          // Заменяем иконки из UI Kit v1
          .replace(/@tochka-modules\/t15-ui-kit\/icons/gim, LIB_NAME)
          // Заменяем иконки из UI Kit v2
          .replace(/@t15-ui-kit\/icons/gim, LIB_NAME);

        if (rulesDirectory) {
          const linter = new Linter({
            fix: true,
            formatter: 'json',
            rulesDirectory: rulesDirectory,
            formattersDirectory: rootDirPath,
          });

          const configuration = Configuration.findConfiguration(null, rootDirPath).results;

          linter.lint(component, newCode, configuration);
          linter.getResult();
        }
      }
    });
}
