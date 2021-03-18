import * as path from 'path';
import * as fs from 'fs';
const dir = path.resolve(__dirname);

const GOAL_VALUES = ['0', '1'];

type TAnalyticsEventInfo = {
    action: string,
    goal?: boolean,
    label?: string,
    methodName: string
}

function spacedWordsToCamelCase(str: string, isUpperCamelCase?: boolean): string {
    const words = str.split(' ');
    const camelCaseReadyWords = words.map((value: string, index: number) => {
        const firstLetterWithCorrectCase = index === 0 && !isUpperCamelCase ?
            value[0].toLowerCase() :
            value[0].toUpperCase();

        return `${firstLetterWithCorrectCase}${value.slice(1).toLowerCase()}`;
    });

    return camelCaseReadyWords.join('');
}

// 'click: possible discount card' -> clickPossibleDiscountCard
function makeMethodName(actionName: string) {
    const cleanActionName = actionName.replace(':', '');

    return spacedWordsToCamelCase(cleanActionName);
}

function parseEventFromLine(eventStr): [string, TAnalyticsEventInfo] | undefined {
    const [eventNumber, category, action, name, details, ...restParts] = eventStr.split(',');
    let goal: string;

    // Если у события в поле "Детали" ничего нет, то тут пусто, а затем следует goal
    if (details === '') {
        goal = restParts[0];
    } else {
        // Иначе нужно искать goal, т.к. запятые могут быть в тексте поля "Детали", тогда разбиение станет неверным
        for (const part of restParts) {
            if (GOAL_VALUES.includes(part)) {
                goal = part;
                break;
            }
        }
    }

    // Если строка начинается не с номера события, то это еще продолжение предыдущей
    if (!eventStr || Number.isNaN(Number(eventNumber))) return undefined;

    const res: TAnalyticsEventInfo = {
        action,
        methodName: makeMethodName(action)
    };

    if (Number(goal)) {
        res.goal = true;
    }

    if (details) {
        res.label = `____EVENT__${eventNumber}__LABEL____`;
    }

    return [category, res];
}

export function getAnalyticsInfoFromEventsMap(pathToEventsMap: string): Record<string, Array<TAnalyticsEventInfo>> {
    const eventsMapTextPlain = fs.readFileSync(path.resolve(dir, pathToEventsMap));
    const eventsTextLines = eventsMapTextPlain.toString('utf8').split('\n');

    const accumulator: Record<string, Array<TAnalyticsEventInfo>> = {};
    eventsTextLines.forEach((line) => {
        const parseResult = parseEventFromLine(line);

        if (!parseResult) return;

        const [category, eventInfo] = parseResult;
        if (!accumulator[category]) {
            accumulator[category] = [eventInfo];
        } else {
            accumulator[category].push(eventInfo);
        }
    });

    return accumulator;
}

// 'tariff discount' -> TariffDiscountAnalytics
export function makeClassName(categoryName: string) {
    return `${spacedWordsToCamelCase(categoryName, true)}Analytics`;
}

// 'tariff discount' -> tariff-discount.analytics
export function makeFileName(categoryName: string) {
    return `${categoryName.replace(' ', '-')}.analytics`;
}
