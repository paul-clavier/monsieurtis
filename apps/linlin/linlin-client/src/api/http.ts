export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly code?: string,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

interface ErrorBody {
    message?: string | string[];
    code?: string;
}

const readError = async (response: Response): Promise<ApiError> => {
    const body = (await response.json().catch(() => ({}))) as ErrorBody;
    const message = Array.isArray(body.message)
        ? body.message.join(", ")
        : (body.message ?? response.statusText);
    return new ApiError(response.status, message, body.code);
};

export const request = async <T>(
    path: string,
    init?: RequestInit & { json?: unknown },
): Promise<T> => {
    const { json, ...rest } = init ?? {};
    const response = await fetch(`/api${path}`, {
        ...rest,
        headers:
            json === undefined
                ? rest.headers
                : { "content-type": "application/json", ...rest.headers },
        body: json === undefined ? rest.body : JSON.stringify(json),
    });
    if (!response.ok) throw await readError(response);
    return (await response.json()) as T;
};

export const toQueryString = (
    params: Record<string, string | undefined>,
): string => {
    const entries = Object.entries(params).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
    );
    return entries.length === 0
        ? ""
        : `?${entries.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&")}`;
};
