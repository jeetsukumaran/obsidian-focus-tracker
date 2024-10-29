import { App, TFile } from "obsidian";

export interface FocusLogEntry {
    rating: number;
    remarks?: string;
}

export type FocusLogsType = {
    [date: string]: number | string | FocusLogEntry;
};

export interface FocusTrackerConfiguration {
    path: string;
    paths: string[];
    properties: { [key:string]: string };
    tags: string[];
    tagSet: string[];
    lastDisplayedDate: string;
    logPropertyName: string;
    ratingSymbols: string[];
    flagSymbols: string[];
    flagKeys: string[];
    titlePropertyNames: string[];
    daysInPast: number;
    daysInFuture: number;
    focalDate: Date;
    rootElement: HTMLElement | undefined;
    focusTracksGoHere: HTMLElement | undefined;
}

// Rating symbols configurations
export const ratingSymbols = {
    "colors1": ["🔴", "🟠", "🟡", "🟢", "🔵"],
    "digitsOpen": ["➀", "➁", "➂", "➃", "➄", "➅", "➆", "➇", "➈", "➉"],
    "digitsFilled": ["➊","➋","➌","➍","➎","➏","➐","➑","➒","➓"],
    "moonPhases": ["🌑", "🌒", "🌓", "🌔", "🌕"]
};

export const flagSymbols = {
    "default": [
        "🚀", "🎯", "📅", "⏳", "🏁",
        "🚩", "⚠️", "🚧", "🐂",
    ]
};

export const flagKeys = {
    "default": [
        "goal, aspirational",
        "goal, committed",
        "due",
        "scheduled",
        "start",
        "flagged",
        "attention",
        "blocked",
        "yak-shaving",
    ]
};

export const SCALE1 = ratingSymbols["colors1"];
export const SCALE2 = flagSymbols["default"];
export const FLAG_KEYS = flagKeys["default"];

export const OUT_OF_BOUNDS = "❗";
export const UNKNOWN_RATING = "❓";

export const MIN_DAYS_PAST = 7;
export const MIN_DAYS_FUTURE = 7;
export const DEFAULT_DAYS_PAST = 14;
export const DEFAULT_DAYS_FUTURE = 14;

export const DEFAULT_CONFIGURATION = (): FocusTrackerConfiguration => ({
    path: "",
    paths: [],
    properties: {},
    tags: [],
    tagSet: [],
    lastDisplayedDate: getTodayDate(),
    logPropertyName: "focus-logs",
    ratingSymbols: SCALE1,
    flagSymbols: SCALE2,
    flagKeys: FLAG_KEYS,
    titlePropertyNames: ["track-label", "focus-tracker-title", "title"],
    daysInPast: DEFAULT_DAYS_PAST,
    daysInFuture: DEFAULT_DAYS_FUTURE,
    focalDate: new Date(),
    rootElement: undefined,
    focusTracksGoHere: undefined,
});

// Helper functions
export function getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function filterDictionary<T>(
    dictionary: { [key: string]: T },
    predicate: (key: string, value: T) => boolean
): { [key: string]: T } {
    return Object.fromEntries(
        Object.entries(dictionary).filter(([key, value]) => predicate(key, value))
    );
}

export function patternsToRegex(patterns: string[]): RegExp[] {
    return patterns.map((pattern: string) => {
        return new RegExp(".*" + pattern + ".*");
    });
}

export function kebabToCamel(s: string): string {
    return s.replace(/(-\w)/g, m => m[1].toUpperCase());
}

export function normalizeKeys<T>(dictionary: { [key: string]: T }): { [key: string]: T } {
    const normalizedDictionary: { [key: string]: T } = {};
    Object.keys(dictionary).forEach(key => {
        normalizedDictionary[kebabToCamel(key)] = dictionary[key];
    });
    return normalizedDictionary;
}
