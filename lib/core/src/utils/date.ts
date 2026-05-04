import { logger } from "./log";

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const MONTH = 30 * DAY;
export const getNow = () => new Date();
export const getNowInSeconds = (): number =>
    Math.floor(new Date().getTime() / 1000);

export const INFINITE_FUTURE_DATE = new Date("9999-12-31T23:59:59.999Z");
export const INFINITE_PAST_DATE = new Date("0000-01-01T00:00:00.000Z");

export const getHours = (date: Date): string =>
    date.getHours().toString().padStart(2, "0");
export const getMinutes = (date: Date): string =>
    date.getMinutes().toString().padStart(2, "0");

export const getMinDate = (dates: (Date | undefined)[]): Date | null => {
    const filteredDates = dates.filter((date) => date !== undefined) as Date[];
    if (filteredDates.length === 0) return null;
    return new Date(Math.min(...filteredDates.map((date) => date.getTime())));
};

export const getMaxDate = (dates: (Date | undefined)[]): Date | null => {
    const filteredDates = dates.filter((date) => date !== undefined) as Date[];
    if (filteredDates.length === 0) return null;
    return new Date(Math.max(...filteredDates.map((date) => date.getTime())));
};

export const isBefore = (targetDate: Date, referenceDate: Date): boolean => {
    return new Date(targetDate) < new Date(referenceDate);
};
