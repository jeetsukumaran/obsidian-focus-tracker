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
    titlePropertyNames: string[];
    daysInPast: number;
    daysInFuture: number;
    focalDate: Date;
    rootElement: HTMLElement | undefined;
    focusTracksGoHere: HTMLElement | undefined;
    prefixColumns: ColumnConfig;
    infixColumns: ColumnConfig;
    postfixColumns: ColumnConfig;
    sortColumn: string;
    sortDescending: boolean;
}

export interface FocusTrackerSettings {
    defaultRatingMap: string;
    // defaultFlagMap: string;
    defaultDaysPast: number;
    defaultDaysFuture: number;
    minDaysPast: number;
    minDaysFuture: number;
}

export interface FocusLogEntry {
    rating: number;
    planningFlags?: string[],
    resultFlags?: string[],
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

export type FlagDefinition = [symbol: string, key: string];
export interface FlagMap {
    flags: FlagDefinition[];
}

// export type FocusLogsType = Record<string, number | string | FocusLogEntry>;
