import { RatingMap, FlagMap } from './types';

export const DEFAULT_MAPS = {
    ratings: {
        colors1: {
                 symbols: ["🔴",  "🟠",   "🟡",   "🟢",        "🔵",        "🟣"],
            descriptions: ["Fail", "Fair", "Good", "Very Good", "Excellent", "Superior"]
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
        activity: {
            symbols: [
                "🏯",
                "🔮",
                "📜",
                "🔱",
                "🛠️",
                "🛞",
            ],
            keys: [
                "Administration",
                "Informatics",
                "Literature",
                "Manuscripting",
                "System",
                "Other",
            ],
        },
        planning: {
            symbols: [
                "🚀",
                // "🏹",
                "🎯",
                "📅",
                "⏳",
                "🏁",
                "📈",
                "🐂",
            ],
            keys: [
                "Goal: aspirational",
                "Goal: committed",
                "Due",
                "Scheduled",
                "Get started",
                "Make progress",
                "Yak shaving",
            ]
        },
        results: {
            symbols: [
                // "👑",
                // "🗿",
                // "🗿",
                "🏆",
                "🏅",
                // "🎯",
                "✅",
                "🪜",
                "⌛",
                "🐂",
                "🚧",
                "⚠️",
                "⏩",
                "❎",
                "⛔",
                "📦",
                "🚩",
                // "❌",
            ],
            keys: [
                "Champion",
                "Heroic",
                // "On target",
                "Success",
                "Made progress",
                "Clocked in the time",
                "Yak-shaving",
                "In-progress",
                "Broken",
                "Forwarded",
                "Canceled",
                "Blocked",
                "Boxed",
                "Fail"
            ]
        },
        // academic: {
        //     symbols: ["📚", "✍️", "📝", "🔬", "📖", "❓", "📌", "⭐", "🎓"],
        //     keys: [
        //         "read",
        //         "write",
        //         "take notes",
        //         "research",
        //         "review",
        //         "question",
        //         "important",
        //         "insight",
        //         "milestone"
        //     ]
        // },
        // project: {
        //     symbols: ["💡", "📋", "👥", "📊", "🔄", "⚡", "🎨", "🔍", "💪"],
        //     keys: [
        //         "idea",
        //         "planning",
        //         "collaboration",
        //         "review metrics",
        //         "in progress",
        //         "high priority",
        //         "design needed",
        //         "needs research",
        //         "effort required"
        //     ]
        // },
        // health: {
        //     symbols: ["🏃", "🥗", "💪", "😴", "💊", "🧘", "🎯", "❤️", "🩺"],
        //     keys: [
        //         "exercise",
        //         "nutrition",
        //         "strength",
        //         "sleep",
        //         "medication",
        //         "mindfulness",
        //         "goal",
        //         "wellbeing",
        //         "checkup"
        //     ]
        // },
        // writing: {
        //     symbols: ["✍️", "📝", "🔍", "📚", "✂️", "🎭", "🎨", "👥", "📖"],
        //     keys: [
        //         "draft",
        //         "edit",
        //         "research",
        //         "reference",
        //         "cut/revise",
        //         "character work",
        //         "creative",
        //         "feedback",
        //         "review"
        //     ]
        // },
        // coding: {
        //     symbols: ["💡", "🧩", "💻", "🖋️", "🐛", "🔍", "🚀", "🛠️", "✅"],
        //     keys: [
        //         "concept",
        //         "planning/problem breakdown",
        //         "coding",
        //         "documentation",
        //         "debugging",
        //         "code review",
        //         "deploy",
        //         "maintenance",
        //         "completed"
        //     ]
        // },
        // project_management: {
        //     symbols: ["💡", "📅", "🤝", "📈", "⚖️", "🚩", "🔄", "📋", "✅"],
        //     keys: [
        //         "project initiation",
        //         "scheduling",
        //         "team coordination",
        //         "tracking progress",
        //         "resource balancing",
        //         "milestone",
        //         "project updates",
        //         "final review",
        //         "project completion"
        //     ]
        // },
        // scientific_project_management: {
        //     symbols: ["💡", "🔬", "🧪", "📊", "📈", "🔄", "📅", "📉", "✅"],
        //     keys: [
        //         "project concept",
        //         "experimentation",
        //         "data collection",
        //         "data analysis",
        //         "modeling",
        //         "status updates",
        //         "timeline management",
        //         "reporting",
        //         "completion"
        //     ]
        // },
        // engineering_project_management: {
        //     symbols: ["💡", "📐", "⚙️", "📊", "📏", "🚧", "🔍", "📋", "✅"],
        //     keys: [
        //         "idea",
        //         "design phase",
        //         "engineering setup",
        //         "metrics definition",
        //         "specifications",
        //         "construction",
        //         "inspection",
        //         "documentation",
        //         "finished"
        //     ]
        // },
        // flight_planning: {
        //     symbols: ["💡", "🗺️", "📏", "📆", "📍", "⏰", "🛫", "🛬", "✅"],
        //     keys: [
        //         "flight concept",
        //         "route mapping",
        //         "distance planning",
        //         "scheduling",
        //         "waypoints",
        //         "time management",
        //         "takeoff",
        //         "landing",
        //         "flight completed"
        //     ]
        // },
        // scientific_manuscript_writing: {
        //     symbols: ["💡", "📚", "🔍", "✍️", "📈", "📝", "✂️", "📖", "✅"],
        //     keys: [
        //         "idea formulation",
        //         "literature review",
        //         "research",
        //         "writing",
        //         "data visualization",
        //         "drafting",
        //         "revision",
        //         "peer review",
        //         "publication"
        //     ]
        // },
        // default: {
        //     symbols: [
        //         "🚀",
        //         "🎯",
        //         "📅",
        //         "⏳",
        //         "🏁",
        //         "📈",
        //         "✅",
        //         "🐂",
        //         "📉",
        //         "⚠️",
        //         "🚧",
        //         "⏩",
        //         "❎",
        //         "⛔",
        //         "📦",
        //         "❌",
        //     ],
        //     keys: [
        //         "goal: aspirational",
        //         "goal: committed",
        //         "due",
        //         "scheduled",
        //         "start",
        //         "progress",
        //         "done",
        //         "yak-shaving",
        //         "regress",
        //         "attention",
        //         "incomplete",
        //         "forwarded",
        //         "canceled",
        //         "blocked",
        //         "stowed",
        //         "unsuccessful",
        //     ]
        // },
    } as Record<string, FlagMap>
} as const;

export const DEFAULT_CONFIG = {
    daysPast: 15,
    daysFuture: 7,
    ratingMap: 'colors1' as keyof typeof DEFAULT_MAPS.ratings,
} as const;

export const MIN_DAYS_PAST = 1;
export const MIN_DAYS_FUTURE = 1;
export const OUT_OF_BOUNDS = "❗";
export const PLUGIN_NAME = "Focus Tracker";

