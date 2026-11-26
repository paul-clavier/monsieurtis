export const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0
        ? `${hours} h`
        : `${hours} h ${String(rest).padStart(2, "0")}`;
};

export const slugify = (value: string): string =>
    value
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

export const plural = (count: number, singular: string, pluralForm?: string) =>
    `${count} ${count === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
