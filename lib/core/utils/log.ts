/* eslint-disable @typescript-eslint/no-explicit-any */
export const logger = {
    log: (message?: any, ...optionalParams: any[]): void => {
        console.log(message, ...optionalParams);
    },
    error: (message?: any, ...optionalParams: any[]): void => {
        console.error(message, ...optionalParams);
    },
    warn: (message?: any, ...optionalParams: any[]): void => {
        console.warn(message, ...optionalParams);
    },
    debug: (message?: any, ...optionalParams: any[]): void => {
        console.debug(message, ...optionalParams);
    },
};
