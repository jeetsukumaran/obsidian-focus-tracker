export function kebabToCamel(s: string): string {
    return s.replace(/(-\w)/g, m => m[1].toUpperCase());
}

export function pathToId(path: string): string {
    return path
        .replace(/\//g, "_")
        .replace(/\./g, "__")
        .replace(/ /g, "___");
}

export function generateUniqueId(): string {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 10000);
    return `focustracker-${timestamp}-${randomNum}`;
}

export function patternsToRegex(patterns: string[]): RegExp[] {
    return patterns.map((pattern: string) => {
        return new RegExp(".*" + pattern + ".*");
    });
}

export function normalizeKeys<T>(dictionary: Record<string, T>): Record<string, T> {
    const normalizedDictionary: Record<string, T> = {};
    Object.keys(dictionary).forEach(key => {
        normalizedDictionary[kebabToCamel(key)] = dictionary[key];
    });
    return normalizedDictionary;
}
