export const splitArrayIntoChunks = <T>(
    array: T[],
    chunkSize: number,
): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
};

export const asyncFilter = <T>(
    array: T[],
    predicate: (elem: T) => Promise<boolean>,
): Promise<T[]> =>
    Promise.all(array.map(predicate)).then((results) =>
        array.filter((_v, index) => results[index]),
    );

export const replaceInArray = <T>(
    array: T[],
    element: T,
    key: keyof T,
): T[] => {
    const index = array.findIndex((elem) => elem[key] === element[key]);
    if (index === -1) {
        return array;
    }
    return [...array.slice(0, index), element, ...array.slice(index + 1)];
};

export const splitInBatches = <T>(array: T[], batchSize: number): T[][] => {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
        batches.push(array.slice(i, i + batchSize));
    }
    return batches;
};

export const executeBatchTasks = async <T>({
    tasks,
    batchSize,
}: {
    tasks: (() => Promise<T>)[];
    batchSize: number;
}): Promise<void> => {
    const taskBatches = splitArrayIntoChunks(tasks, batchSize);

    for (const batch of taskBatches) {
        await Promise.allSettled(batch.map((fn) => fn()));
    }
};
