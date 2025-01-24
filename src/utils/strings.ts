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

export function parseLink(input: string): { filepath: string; displayText: string } {
    const mediaWikiRegex = /\[\[([^\|\]]+)(?:\|([^\]]+))?\]\]/; // Obsidian-style mediawiki link
    const markdownRegex = /\[([^\]]+)\]\(([^)]+)\)/; // Standard Markdown link

    let filepath = "";
    let displayText = "";

    if (mediaWikiRegex.test(input)) {
        const match = input.match(mediaWikiRegex);
        if (match) {
            filepath = match[1];
            displayText = match[2] || ""; // Use alias if provided, else empty
        }
    } else if (markdownRegex.test(input)) {
        const match = input.match(markdownRegex);
        if (match) {
            filepath = match[2]; // URL or file path
            displayText = match[1]; // Link text
        }
    }

    return { filepath, displayText };
}

