import {
    App,
    parseYaml,
    Notice,
    TAbstractFile,
    TFile
} from "obsidian";

const PLUGIN_NAME = "Focus Tracker";
const DAYS_TO_SHOW = 21;
const DAYS_TO_LOAD = DAYS_TO_SHOW + 1;
const SCALE1 = [
    // "",
    // "⚫",
    // "🔘",
    "⚪",
    "🔴",
    "🟠",
    "🟡",
    "🟢",
    // "🔵",
    // "🟣",
    // "🟤",
    // "⚪",
    // "⚫",
];

const SCALE2 = [
    "⚪",
    "⚫",
];

const SCALE1_square = [
    // "",
    "⬜",
    "🟥",
    "🟧",
    "🟨",
    "🟩",
    "🟦",
    "🟪",
    // "🟫",
    // "⬛",
    // "⬜",
];

const OUT_OF_BOUNDS_INDEX_POSITIVE = "❗";
const OUT_OF_BOUNDS_INDEX_NEGATIVE = "⭕";
const UNKNOWN_RATING = "❓";

export type FocusLogsType = {
    [date: string]: number;
};

interface FocusTrackerSettings {
    path: string;
    lastDisplayedDate: string;
    daysToShow: number;
    logPropertyName: string;
    ratingScale: string[];
    ratingScaleAlternate: string[];
    titlePropertyName: string;
    daysToLoad: number;
    rootElement: HTMLElement | undefined;
    focusTracksGoHere: HTMLElement | undefined;
};

const DEFAULT_SETTINGS = (): FocusTrackerSettings => ({
    path: "",
    lastDisplayedDate: getTodayDate(),
    daysToShow: DAYS_TO_SHOW,
    logPropertyName: "focus-logs",
    ratingScale: SCALE1,
    ratingScaleAlternate: SCALE2,
    titlePropertyName: "title",
    daysToLoad: DAYS_TO_LOAD,
    rootElement: undefined,
    focusTracksGoHere: undefined,
});

const ALLOWED_USER_SETTINGS = ["path", "lastDisplayedDate", "daysToShow"];

function getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getDaysDifference(startDateId: string, endDateId: string): number {
    const start = new Date(startDateId);
    const end = new Date(endDateId);
    const oneDay = 24 * 60 * 60 * 1000; // hours * minutes * seconds * milliseconds

    const diffInTime = Math.abs(end.getTime() - start.getTime());
    const diffInDays = Math.round(diffInTime / oneDay);

    return diffInDays;
}

export default class FocusTracker {
    settings: FocusTrackerSettings;
    app: App;
    id: string;

    constructor(src: string, el: HTMLElement, ctx: any, app: App) {
        this.app = app;
        this.id = this.generateUniqueId();
        this.settings = this.loadSettings(src);
        this.settings.rootElement = el;

        // 1. get all the focus tracks
        const files = this.loadFiles();

        if (files.length === 0) {
            this.renderNoFocussFoundMessage();
            return;
        }

        // 2.1 render the element that holds all focus tracks
        this.settings.focusTracksGoHere = this.renderRoot(el);

        // 2.2 render the header
        this.renderHeader(this.settings.focusTracksGoHere);

        // 2.3 render each focus
        files.forEach(async (f) => {
            await this.renderFocusLogs(
                f.path,
                await this.readFocusLogs(f.path),
            );
        });
    }

    loadFiles(): TFile[] {
        return this.app.vault
            .getMarkdownFiles()
            .filter((file: TFile) => {
                // only focus tracks
                if (!file.path.includes(this.settings.path)) {
                    return false;
                }

                return true;
            })
            .sort((a: TFile, b: TFile) => a.name.localeCompare(b.name));
    }

    loadSettings(rawSettings: string): FocusTrackerSettings {
        try {
            let settings = Object.assign(
                {},
                DEFAULT_SETTINGS(),
                this.removePrivateSettings(JSON.parse(rawSettings)),
            );
            settings.daysToLoad = settings.daysToShow + 1;
            return settings;
        } catch (error) {
            new Notice(
                `${PLUGIN_NAME}: received invalid settings. continuing with default settings`,
            );
            return DEFAULT_SETTINGS();
        }
    }

    removePrivateSettings(userSettings: {[key: string]: any}): {[key: string]: any} {
        const result: {[key: string]: any} = {};
        ALLOWED_USER_SETTINGS.forEach((key) => {
            if (userSettings[key]) {
                result[key] = userSettings[key];
            }
        });

        return result;
    }

    renderNoFocussFoundMessage(): void {
        this.settings.rootElement?.createEl("div", {
            text: `No focus tracks found under ${this.settings.path}`,
        });
    }

    renderRoot(parent: HTMLElement): HTMLElement {
        const rootElement = parent.createEl("div", {
            cls: "focus-tracker",
        });
        rootElement.setAttribute("id", this.id);

        // Event listener for left-click and shift+left-click
        rootElement.addEventListener("click", (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target?.classList.contains("focus-tick")) {
                const focusRating: number = this.getFocusRatingFromElement(target);
                if (e.altKey) {
                    // Decrement rating on shift-click
                    this.stepFocusLogEntry(target, -1);
                } else {
                    // Increment rating on plain left-click
                    this.stepFocusLogEntry(target, 1);
                }
                target.title = `Current rating: ${focusRating}; left-click to increment, alt-left-click to decrement`;
            }
        });

        return rootElement;
    }

    renderHeader(parent: HTMLElement): void {
        const header = parent.createEl("div", {
            cls: "focus-tracker__header focus-tracker__row",
        });

        header.createEl("div", {
            text: "",
            cls: "focus-tracker__cell--name focus-tracker__cell",
        });

        const currentDate = this.createDateFromFormat(
            this.settings.lastDisplayedDate,
        );
        currentDate.setDate(currentDate.getDate() - this.settings.daysToLoad + 1);
        for (let i = 0; i < this.settings.daysToLoad; i++) {
            const day = currentDate.getDate().toString();
            header.createEl("div", {
                cls: `focus-tracker__cell focus-tracker__cell--${this.getDayOfWeek(
                    currentDate,
                )}`,
                text: day,
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    async getFrontmatter(path: string): Promise<{[key: string]: any}> {
        const file: TAbstractFile|null = this.app.vault.getAbstractFileByPath(path);

        if (!file || !(file instanceof TFile)) {
            new Notice(`${PLUGIN_NAME}: No file found for path: ${path}`);
            return {};
        }

        try {
            return await this.app.vault.read(file).then((result) => {
                const frontmatter = result.split("---")[1];
                if (!frontmatter) {
                    return {};
                }
                return parseYaml(frontmatter);
            });
        } catch (error) {
            return {};
        }
    }

    normalizeLogs(source: { [date: string]: any }): { [date: string]: number } {
        const result: { [date: string]: number } = {};
        Object.keys(source).forEach(date => {
            const value = source[date];
            const numValue = Number(value);
            if (!isNaN(numValue)) {
                result[date] = numValue;
            } else {
                result[date] = !value ? 0 : 10;
            }
        });
        return result;
    }

    async readFocusLogs(path: string): Promise<FocusLogsType> {
        const frontmatter = await this.getFrontmatter(path);
        const fmLogs = frontmatter[this.settings.logPropertyName] || {};
        return this.normalizeLogs(fmLogs);
    }

    async renderFocusLogs(
        path: string,
        entries: FocusLogsType,
    ): Promise<void> {
        if (!this.settings.focusTracksGoHere) {
            new Notice(`${PLUGIN_NAME}: missing div that holds all focus tracks`);
            return;
        }
        const parent = this.settings.focusTracksGoHere;

        let name = path.split('/').pop()?.replace('.md', '') || path;
        if (this.settings.titlePropertyName) {
            let frontmatter = await this.getFrontmatter(path);
            if (frontmatter && frontmatter[this.settings.titlePropertyName]) {
                name = frontmatter[this.settings.titlePropertyName] || name;
            }
        }

        let row = parent.querySelector(`*[data-id="${this.pathToId(path)}"]`);

        if (!row) {
            row = this.settings.focusTracksGoHere.createEl("div", {
                cls: "focus-tracker__row",
            });
            row.setAttribute("data-id", this.pathToId(path));
        } else {
            this.removeAllChildNodes(row as HTMLElement);
        }

        const focusTitle = row.createEl("div", {
            cls: "focus-tracker__cell--name focus-tracker__cell",
        });

        const focusTitleLink = focusTitle.createEl("a", {
            text: name,
            cls: "internal-link",
        });

        focusTitleLink.setAttribute("href", path);
        focusTitleLink.setAttribute("aria-label", path);

        const currentDate = this.createDateFromFormat(
            this.settings.lastDisplayedDate,
        );
        currentDate.setDate(currentDate.getDate() - this.settings.daysToLoad + 1); // todo, why +1?

        for (let i = 0; i < this.settings.daysToLoad; i++) {
            const dateString: string = this.getDateId(currentDate);
            const entryValue: number = entries[dateString] || 0;
            const displayValue: string = this.getDisplaySymbol(entryValue);
            let isTicked: boolean = entryValue !== 0;

            const focusCell = row.createEl("div", {
                cls: `focus-tracker__cell
                focus-tick
                focus-tick-entry
                focus-tick--${isTicked}
                focus-tracker__cell--${this.getDayOfWeek(currentDate)}`,
            });

            focusCell.setAttribute("ticked", isTicked.toString());

            focusCell.setAttribute("date", dateString);
            focusCell.setAttribute("focusTrackerPath", path);
            focusCell.setAttribute("focusRating", entryValue.toString());

            focusCell.setText(displayValue);
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    getColorForValue(currentValue: number, maxScale: number, baseColor: string, isLightMode: boolean): string {
        // Base colors mapped to their hex values
        const colorMap: { [key: string]: string } = {
            red: '#ff0000',
            blue: '#0000ff',
            green: '#008000',
            cyan: '#00ffff',
            magenta: '#ff00ff',
            yellow: '#ffff00',
            black: '#000000',
            white: '#ffffff',
            gray: '#808080',
            orange: '#ffa500',
            purple: '#800080',
            pink: '#ffc0cb'
        };

        // Get the base hex color from the map
        let hexColor = colorMap[baseColor.toLowerCase()] || '#000000';

        // Calculate the scale index
        let scaleIndex = currentValue <= 0 ? 0 : currentValue >= maxScale ? maxScale : currentValue;

        // Convert hex color to RGB
        let r = parseInt(hexColor.substring(1, 3), 16);
        let g = parseInt(hexColor.substring(3, 5), 16);
        let b = parseInt(hexColor.substring(5, 7), 16);

        // Calculate the percentage change for lightening or darkening
        let percentageChange = (scaleIndex / maxScale) * 100;

        // Adjust color brightness based on the mode and current value
        let adjustBrightness = (colorComponent: number, percentage: number): number => {
            if (isLightMode) {
                return Math.min(255, Math.round(colorComponent + (255 - colorComponent) * percentage / 100));
            } else {
                return Math.max(0, Math.round(colorComponent * (1 - percentage / 100)));
            }
        };

        // Apply brightness adjustment
        r = adjustBrightness(r, percentageChange);
        g = adjustBrightness(g, percentageChange);
        b = adjustBrightness(b, percentageChange);

        // Convert back to hex
        const toHex = (colorComponent: number) => colorComponent.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    getFocusRatingFromElement(el: HTMLElement): number {
        const attrValue = el.getAttribute("focusRating");
        if (!attrValue || attrValue === null || attrValue.trim() === "") {
            return 0;  // Returns 0 for null, undefined, or empty string attributes
        }
        const numValue = Number(attrValue);
        // Returns 0 if the value is NaN or 0, otherwise returns 10
        return isNaN(numValue) || numValue === 0 ? 0 : numValue;
    }

    getScaleValue(input: string | number, scale: string[]): number {
        if (typeof input === 'string') {
            const index = scale.indexOf(input);
            return index !== -1 ? index : 0;
        } else if (typeof input === 'number') {
            return input;
        }
        return 0; // Default return for unexpected input types
    }

    getDisplaySymbol(input: string | number): string {
        let index: number = 0;
        let symbol = " ";
        let ratingScale: string[] = this.settings.ratingScale;
        let oobSymbol = OUT_OF_BOUNDS_INDEX_POSITIVE;
        if (typeof input === 'string') {
            if (input === "") {
                index = 0;
            } else {
                // index === -1 if the value of the log entry is not a rating symbol
                // index = scale.indexOf(input);
                if (index === -1) {
                    return UNKNOWN_RATING;
                }
            }
        } else if (typeof input === 'number') {
            index = input;
        }
        if (index < 0) {
            index = -1 * index;
            ratingScale = this.settings.ratingScaleAlternate;
            oobSymbol = OUT_OF_BOUNDS_INDEX_NEGATIVE;
        }
        if (index >= ratingScale.length) {
            return oobSymbol;
        } else {
            symbol = ratingScale[index];
        }
        return symbol;
    }

    async stepFocusLogEntry(el: HTMLElement, step: number = 1): Promise<number> {
        const focusTrackerPath: string | null = el.getAttribute("focusTrackerPath");
        const date: string | null = el.getAttribute("date");

        const currentValue: number = this.getFocusRatingFromElement(el);
        const maxScaleIndex: number = this.settings.ratingScale.length;
        let newValue: number = currentValue + step;
        if (newValue >= maxScaleIndex) {
            newValue = 0;
        } else if (newValue < 0) {
            newValue = maxScaleIndex - 1;
        }

        if (!focusTrackerPath || !date) {
            new Notice(`${PLUGIN_NAME}: Missing data attributes for focus tracking.`);
            return currentValue;
        }

        const file: TAbstractFile | null = this.app.vault.getAbstractFileByPath(focusTrackerPath);

        if (!file || !(file instanceof TFile)) {
            new Notice(`${PLUGIN_NAME}: File missing while trying to change focus rating.`);
            return currentValue;
        }

        this.app.fileManager.processFrontMatter(file, (frontmatter: { [key: string]: any }) => {
            let entries: { [key: string]: number } = frontmatter[this.settings.logPropertyName] || {};
            entries[date] = newValue;
            frontmatter[this.settings.logPropertyName] = entries;
            new Notice(`Rating: ${newValue}`, 600);
        });

        await this.renderFocusLogs(file.path, await this.readFocusLogs(file.path));

        return newValue;

    }

    writeFile(file: TAbstractFile, content: string): Promise<void> {
        if (!content) {
            new Notice(
                `${PLUGIN_NAME}: could not save changes due to missing content`,
            );
            return Promise.reject(new Error("Missing content"));
        }

        if (!file ||!(file instanceof TFile)) {
            new Notice(
                `${PLUGIN_NAME}: could not save changes due to missing file`,
            );
            return Promise.reject(new Error("Missing file"));
        }

        try {
            return this.app.vault.modify(file, content);
        } catch (error) {
            new Notice(`${PLUGIN_NAME}: could not save changes`);
            return Promise.reject(error);
        }
    }

    removeAllChildNodes(parent: HTMLElement): void {
        while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
        }
    }

    pathToId(path: string): string {
        return path
            .replace(/\//g, "_")
            .replace(/\./g, "__")
            .replace(/ /g, "___");
    }

    createDateFromFormat(dateString: string): Date {
        const [year, month, day] = dateString.split("-").map(Number);
        const date = new Date();

        date.setFullYear(year);
        date.setMonth(month - 1);
        date.setDate(day);

        return date;
    }

    getDateId(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        let dateId = `${year}-${month}-${day}`;

        return dateId;
    }

    getDayOfWeek(date: Date): string {
        const daysOfWeek = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
        ];
        const dayIndex = date.getDay();
        const dayName = daysOfWeek[dayIndex];
        return dayName.toLowerCase();
    }

    generateUniqueId(): string {
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 10000); // Adjust the range as needed
        return `focustracker-${timestamp}-${randomNum}`;
    }
}

