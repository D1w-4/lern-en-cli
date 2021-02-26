import * as path from 'path';
import * as fs from 'fs';
const dir = path.resolve(__dirname);

type TAnalyticsEventInfo = {
    action: string,
    goal: boolean,
    label?: string,
    methodName: string
    name: string
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
    const [eventNumber, category, action, name, details, goal, description, screenshotLink] = eventStr.split(',');

    // Если строка начинается не с номера события, то это еще продолжение предыдущей
    if (!eventStr || Number.isNaN(Number(eventNumber))) return undefined;

    const res: TAnalyticsEventInfo = {
        action,
        goal: Boolean(Number(goal)),
        methodName: makeMethodName(action),
        name
    };

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
