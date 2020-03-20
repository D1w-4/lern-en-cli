export function chunkPromise(fnList: Array<() => Promise<any>>, chunkSize: number) {
    if (!fnList.length) {
        return Promise.resolve([]);
    }
    let prList = [];
    for (let i = 0; i < 20; i++) {
        if (fnList.length) {
            const fn = fnList.shift();
            prList.push(fn());
        }
    }
    const pr = Promise.all(prList).then((prevResult) => {
        return chunkPromise(fnList, chunkSize).then(result => {
            prevResult.push(...result);
            return prevResult;
        });
    });

    return pr;
}
