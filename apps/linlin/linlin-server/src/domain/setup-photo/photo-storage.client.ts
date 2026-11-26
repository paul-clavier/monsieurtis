export interface StoredPhoto {
    content: Uint8Array;
    contentType: string;
}

export interface PhotoStorage {
    put(key: string, content: Uint8Array, contentType: string): Promise<void>;
    get(key: string): Promise<StoredPhoto | null>;
    delete(keys: string[]): Promise<void>;
}
