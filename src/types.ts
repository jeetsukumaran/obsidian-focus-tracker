// // types.ts

// export interface RatingMap {
//     symbols: string[];
//     descriptions?: string[];
// }

// export interface FlagMap {
//     symbols: string[];
//     keys: string[];
// }

// export interface FocusLogEntry {
//     rating: number;
//     remarks?: string;
// }


// export interface ColumnConfig {
//     [displayName: string]: string;
// }

// export interface FocusTrackerConfiguration {
//     path: string;
//     paths: string[];
//     properties: Record<string, string>;
//     tags: string[];
//     tagSet: string[];
//     excludeTags: string[]; // New: Tags to exclude (OR)
//     excludeTagSet: string[]; // New: Set of tags to exclude (AND)
//     lastDisplayedDate: string;
//     logPropertyName: string;
//     ratingSymbols: string[];
//     flagSymbols: string[];
//     flagKeys: string[];
//     titlePropertyNames: string[];
//     daysInPast: number;
//     daysInFuture: number;
//     focalDate: Date;
//     rootElement?: HTMLElement;
//     focusTracksGoHere?: HTMLElement;
//     prefixColumns: ColumnConfig;
//     postfixColumns: ColumnConfig;
//     sortColumn: string;  // Column name being sorted
//     sortDescending: boolean;  // Sort direction
// }

export interface FocusTrackerConfiguration {
    path: string;
    paths: string[];
    properties: Record<string, any>;
    tags: string[];
    tagSet: string[];
    excludeTags: string[];
    excludeTagSet: string[];
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
    prefixColumns: ColumnConfig;
    postfixColumns: ColumnConfig;
    sortColumn: string;
    sortDescending: boolean;
}

export interface FocusTrackerSettings {
    defaultRatingMap: string;
    defaultFlagMap: string;
    defaultDaysPast: number;
    defaultDaysFuture: number;
    minDaysPast: number;
    minDaysFuture: number;
}

export interface FocusLogEntry {
    rating: number;
    remarks?: string;
}

export interface FocusLogsType {
    [date: string]: FocusLogEntry;
}

export interface ColumnConfig {
    [displayName: string]: string;
}

export interface RatingMap {
    symbols: string[];
}

export interface FlagMap {
    symbols: string[];
    keys: string[];
}

// export type FocusLogsType = Record<string, number | string | FocusLogEntry>;
