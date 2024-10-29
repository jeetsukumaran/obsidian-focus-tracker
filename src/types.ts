// types.ts
export interface RatingMap {
    symbols: string[];
    descriptions?: string[];
}

export interface FlagMap {
    symbols: string[];
    keys: string[];
}

export interface FocusLogEntry {
    rating: number;
    remarks?: string;
}

export type FocusLogsType = Record<string, number | string | FocusLogEntry>;

export interface FocusTrackerConfiguration {
    path: string;
    paths: string[];
    properties: Record<string, string>;
    tags: string[];
    tagSet: string[];
    excludeTags: string[]; // New: Tags to exclude (OR)
    excludeTagSet: string[]; // New: Set of tags to exclude (AND)
    lastDisplayedDate: string;
    logPropertyName: string;
    ratingSymbols: string[];
    flagSymbols: string[];
    flagKeys: string[];
    titlePropertyNames: string[];
    daysInPast: number;
    daysInFuture: number;
    focalDate: Date;
    rootElement?: HTMLElement;
    focusTracksGoHere?: HTMLElement;
}
