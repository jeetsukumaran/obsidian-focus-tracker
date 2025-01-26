import { FocusTrackerConfiguration } from '../types';
import { getTodayDate } from '../utils/dates';
import { DEFAULT_MAPS, DEFAULT_CONFIG } from '../constants';

export const DEFAULT_CONFIGURATION = (): FocusTrackerConfiguration => ({
    path: "",
    paths: [],
    properties: {},
    tags: [],
    tagSet: [],
    excludeTags: [],
    excludeTagSet: [],
    lastDisplayedDate: getTodayDate(),
    logPropertyName: "focus-logs",
    ratingSymbols: DEFAULT_MAPS.ratings[DEFAULT_CONFIG.ratingMap].symbols,
    flagSymbols: DEFAULT_MAPS.flags[DEFAULT_CONFIG.flagMap].symbols,
    flagKeys: DEFAULT_MAPS.flags[DEFAULT_CONFIG.flagMap].keys,
    titlePropertyNames: ["track-label", "focus-tracker-title", "title"],
    daysInPast: DEFAULT_CONFIG.daysPast,
    daysInFuture: DEFAULT_CONFIG.daysFuture,
    focalDate: new Date(),
    rootElement: undefined,
    focusTracksGoHere: undefined,
    titleColumn: {},
    prefixColumns: {},
    infixColumns: {},
    postfixColumns: {},
    sortColumn: '',
    sortDescending: false,
});
