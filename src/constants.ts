import { RatingMap, FlagMap } from './types';

export const DEFAULT_MAPS = {
    ratings: {
        colors1: {
            symbols: ["🔴", "🟠", "🟡", "🟢", "🔵"],
            descriptions: ["Poor", "Fair", "Good", "Very Good", "Excellent"]
        },
        digitsOpen: {
            symbols: ["➀", "➁", "➂", "➃", "➄", "➅", "➆", "➇", "➈", "➉"],
            descriptions: Array.from({length: 10}, (_, i) => `Level ${i + 1}`)
        },
        digitsFilled: {
            symbols: ["➊","➋","➌","➍","➎","➏","➐","➑","➒","➓"],
            descriptions: Array.from({length: 10}, (_, i) => `Level ${i + 1}`)
        },
        moonPhases: {
            symbols: ["🌑", "🌒", "🌓", "🌔", "🌕"],
            descriptions: ["New", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full"]
        }
    } as Record<string, RatingMap>,
    flags: {
        default: {
            symbols: ["🚀", "🎯", "📅", "⏳", "🏁", "🚩", "⚠️", "🚧", "🐂"],
            keys: [
                "goal, aspirational",
                "goal, committed",
                "due",
                "scheduled",
                "start",
                "flagged",
                "attention",
                "blocked",
                "yak-shaving"
            ]
        }
    } as Record<string, FlagMap>
} as const;

export const DEFAULT_CONFIG = {
    daysPast: 7,
    daysFuture: 7,
    ratingMap: 'digitsFilled' as keyof typeof DEFAULT_MAPS.ratings,
    flagMap: 'default' as keyof typeof DEFAULT_MAPS.flags
} as const;

export const MIN_DAYS_PAST = 7;
export const MIN_DAYS_FUTURE = 7;
export const OUT_OF_BOUNDS = "❗";
export const PLUGIN_NAME = "Focus Tracker";
