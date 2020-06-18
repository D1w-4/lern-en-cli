### ebash

Утилита для облегчения работы фронтендеров точки.

Суть проекта - собрать единую кодовую базу консольных утилит которыми пользуются фронтендеры.

Умеет:
- создание микросевисов 
- обновление зависимости 
- генерациия компонентов, документации, манифестов
- анализ репозитории 

Проект является open-source.

Позволено расширять функционал, вне зависимости от количества потребителей.

### Установка
Для правильной работы необходимо устанавливать ebash в глобальный node_modules npm, и не забыть указать registry Точки

```npm global install ebash --registry http://nexus.bank24.int/repository/npm-group/``` 

Если нет прав на запись в дирректорию global npm то можно изменить ее местонахождение либо дать нужные права

Права
```sudo chown -R $(whoami) /usr/local/lib``` 

[Изменение директории npm](https://github.com/mixonic/docs.npmjs.com/blob/master/content/getting-started/fixing-npm-permissions.md)

###Описание функционала  
```ebash -h```
<br>
cписок команд доступных на уровне пространства, работает на любом уровне

```ebash config``` 
<br>
пространство для конфиругации `ebash`

```ebash config registry```
<br>
команда для переключения глобального `registry`

- tochka (http://nexus.bank24.int/repository/npm-group/) основной registry Точки
- tochka_publish (http://nexus.bank24.int/repository/tochka-modules/)  основной registry Точки для публикации пакетов
- global_npm (https://registry.npmjs.com/)  глобальный registry npm

```
ebash config stash --token <token>
ebash config gitlab ---token <token>
```
Установка токена доступа к [stash.bank24.int](https://stash.bank24.int/).
<br>
Создать токен можно в [профиле stash](https://stash.bank24.int/plugins/servlet/access-tokens/manage) 
<br>
Установка токена доступа к [gitlab.tochka-tech.com](https://gitlab.tochka-tech.com/).
<br>
Создать токен можно в [настройках аккаунта gitlabl](https://gitlab.tochka-tech.com/profile/personal_access_tokens)
```javascript
Пример
ebash config stash --token q23s4987djaq2
ebash config gitlab --token q23s4987djaq2
```
<br>
<br>

```javascript
ebash t15 make fn <name>
ebash t15 make class <name>
```
<br>
Создает функциональный или классовый компонент в папке, с index.ts, файлом компонента, подключеным `React`
 и создаными интерфейсами для `props` и `state`
 
```
Пример
ebash t15 make fn customer
ebash t15 make fn customerAccount
```
<br>
<br>

```ebash t15 actualyze```
<br>
Обновляет версию пакета `t15-dependency` в микросрвисе и устанавливает зависимости

```ebash t15 info```
<br>
При запуске без параметров предлагает выбрать из списка всех микросервисов
<br>
Отображает в консоль следующую информацию о микросервисе:
+ описание
+ владельцев
+ зависимости
+ ссылку на репозиторий  
+ ссылку на деплой

```ebash t15 list```
<br>
Отображает список всех микросервисов

```ebash t15 create <serviceName>```
<br>
Создает новый микросервис, после создания сервиса автоматически изменяет файл манифеста и предлагает сгенерировать документацию

```ebash t15 manifest <manifesPath>```
Позволяет изменить файл манифеста микросервиса

```javascript
Пример
// space /MyMicroService
ebash t15 manifest ./config/config.json
```

```ebash t15 doc <manifesPath>```
<br>
Подзволяет сгенерировать Markdown документацию микросервиса после ответа на несколько вопросов.
<br>
Создает файл `json` и `md`, если файл `json`
уже имеется в директории запуска команды, то данные подтянутся из него в качестве данных по умолчанию

```javascript
Пример
// space /MyMicroService
ebash t15 doc ./config/config.json
```

```ebash t15-analyze issues```
<br>
Анализирует количество и затраченое время на закрытие issues проекта [ui-kit](https://gitlab.tochka-tech.com/frontend-core/t15-ui-kit)
<br>
Выводит данные в форматах `csv` или `json`
<br>
При выводе в `csv` имена файлов создаются автоматически
<br>
При выводе в `json` нужно указать имя файла

```
Пример

ebash t15-analyze issues --csv
ebash t15-analyze issues --output ./myFile.json
```

```ebash t15-analyze use-style```
<br>
Анализирует использование css в микросервисах.
<br>
Для просмотра параметров `ebash t15-analyze use-style -h`


```ebash t15-analyze use-ui-kit```
<br>
Анализирует использование ui-kit разных версий в микросервисах.
<br>
Для просмотра параметров `ebash t15-analyze use-ui-kit -h`
