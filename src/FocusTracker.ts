import {
    App,
    parseYaml,
    Notice,
    Menu,
    TAbstractFile,
    TFile
} from "obsidian";

const PLUGIN_NAME = "Focus Tracker";
const DAYS_TO_SHOW = 21;
const DAYS_TO_LOAD = DAYS_TO_SHOW + 1;
const symbolArrays = {
    "colors1": ["🔴", "🟠", "🟡", "🟢", "🔵",], // "⚪", "⚫",
    "digitsOpen": ["➀", "➁", "➂", "➃", "➄", "➅", "➆", "➇", "➈", "➉",],
    "digitsFilled": ["➊","➋","➌","➍","➎","➏","➐","➑","➒","➓",],
}

const flagArrays = {
    "default": ["🔥", "🚩", "⚠️", "🚧", "🏁", "🎯", "🚀", "🐂", ],
}

const SCALE1 = symbolArrays["colors1"];
const SCALE2 = flagArrays["default"];

const OUT_OF_BOUNDS = "❗";
const UNKNOWN_RATING = "❓";

export type FocusLogsType = {
    [date: string]: number | string;
};

interface FocusTrackerConfiguration {
    pathPattern: string;
    lastDisplayedDate: string;
    daysToShow: number;
    logPropertyName: string;
    ratingSymbols: string[];
    flagSymbols: string[];
    titlePropertyNames: string[];
    daysToLoad: number;
    rootElement: HTMLElement | undefined;
    focusTracksGoHere: HTMLElement | undefined;
};

const DEFAULT_CONFIGURATION = (): FocusTrackerConfiguration => ({
    pathPattern: "",
    lastDisplayedDate: getTodayDate(),
    daysToShow: DAYS_TO_SHOW,
    logPropertyName: "focus-logs",
    ratingSymbols: SCALE1,
    flagSymbols: SCALE2,
    titlePropertyNames: ["focus-tracker-title", "title"],
    daysToLoad: DAYS_TO_LOAD,
    rootElement: undefined,
    focusTracksGoHere: undefined,
});

const PRIVATE_CONFIGURATION = new Set<string>([
    "rootElement",
    "focusTracksGoHere",
]);

function filterDictionary<T>(
    dictionary: { [key: string]: T },
    predicate: (key: string, value: T) => boolean
): { [key: string]: T } {
    return Object.fromEntries(
        Object.entries(dictionary).filter(([key, value]) => predicate(key, value))
    );
}

// Function to filter a configuration dictionary based on a set of private keys.
// function filterConfiguration<T>(
//     yamlString: string,
//     privateKeys: Set<string>,
//     parseFunction: (yaml: string) => { [key: string]: T }
// ): { [key: string]: T } {
//     const rawConfiguration: { [key: string]: T } = parseFunction(yamlString);
//     const filteredConfiguration: { [key: string]: T } = Object.fromEntries(
//         Object.entries(rawConfiguration).filter(([key, _]) => {
//             return privateKeys.has(key);
//         })
//     );
//     return filteredConfiguration;
// }

function kebabToCamel(s: string): string {
    return s.replace(/(-\w)/g, m => m[1].toUpperCase());
}

function normalizeKeys<T>(dictionary: { [key: string]: T }): { [key: string]: T } {
    const normalizedDictionary: { [key: string]: T } = {};
    Object.keys(dictionary).forEach(key => {
        normalizedDictionary[kebabToCamel(key)] = dictionary[key];
    });
    return normalizedDictionary;
}

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
    rootElement: HTMLElement;
    configuration: FocusTrackerConfiguration;
    app: App;
    id: string;

    private _ratingSymbols: string[];
    private _flagSymbols: string[];

    constructor(src: string, el: HTMLElement, ctx: any, app: App) {
        this.app = app;
        this.id = this.generateUniqueId();
        this.configuration = this.loadConfiguration(src);
        this.rootElement = el;
        this.refresh();
    }

    async refresh() {
        // 1. get all the focus tracks
        const files = this.loadFiles();
        if (files.length === 0) {
            this.renderNoFocussFoundMessage();
            return;
        }
        this.rootElement.empty();
        const focusTrackerContainer = this.rootElement.createEl("div", {
            cls: "focus-tracker-container",
        });
        this.configuration.focusTracksGoHere = this.renderRoot(focusTrackerContainer);
        this.renderHeader(this.configuration.focusTracksGoHere);

        let focalTargetLabels: [string, TFile][] = await Promise.all(files.map(async (f) => {
            return [await this.getFocusTargetLabel(f.path), f];
        }));

        // Sort the array based on the labels (first element of the tuple)
        focalTargetLabels.sort((a, b) => a[0].localeCompare(b[0]));

        // Iterate through the sorted array to render logs
        for (const [focusTargetLabel, f] of focalTargetLabels) {
            const focusLogs = await this.readFocusLogs(f.path);
            await this.renderFocusLogs(
                f.path,
                focusTargetLabel,
                focusLogs
            );
        }
    }

    loadFiles(): TFile[] {
        let pathPattern = new RegExp(".*" + this.configuration.pathPattern + ".*");
        return this.app.vault
            .getMarkdownFiles()
            .filter((file: TFile) => {
                return pathPattern.test(file.path);
            })
            .sort((a: TFile, b: TFile) => a.name.localeCompare(b.name));
    }

    loadConfiguration(configurationString: string): FocusTrackerConfiguration {
        try {
            let configuration = Object.assign(
                {},
                DEFAULT_CONFIGURATION(),
                // this.removePrivateConfiguration(JSON.parse(configurationString)),
                // parseYaml(configurationString).filter( [key: string, value: any] => {
                //     return PRIVATE_CONFIGURATION.has(key);
                // });
                filterDictionary(normalizeKeys(parseYaml(configurationString)), (key, value) => {
                    return !PRIVATE_CONFIGURATION.has(key);
                }),
            );
            configuration.daysToLoad = configuration.daysToShow + 1;
            return configuration;
        } catch (error) {
            new Notice(
                `${PLUGIN_NAME}: received invalid configuration. continuing with default configuration`,
            );
            return DEFAULT_CONFIGURATION();
        }
    }


    renderNoFocussFoundMessage(): void {
        this.rootElement?.empty();
        this.rootElement?.createEl("div", {
            text: `No focus tracks found with path pattern: ${this.configuration.pathPattern}`,
        });
    }

    renderRoot(parent: HTMLElement): HTMLElement {
        const rootElement = parent.createEl("div", {
            cls: "focus-tracker",
        });
        rootElement.setAttribute("id", this.id);
        return rootElement;
    }

    getLastDate() {
        let lastDate = new Date();
        lastDate.setDate(lastDate.getDate() + 7);
        return lastDate;
    }

    get ratingSymbols() {
        if (!this._ratingSymbols) {
            this._ratingSymbols = [
                ... this.configuration.ratingSymbols,
            ];
        }
        return this._ratingSymbols;
    }

    get flagSymbols() {
        if (!this._flagSymbols) {
            this._flagSymbols = [
                ... this.configuration.flagSymbols,
            ];
        }
        return this._flagSymbols;
    }


    renderHeader(parent: HTMLElement): void {
        const header = parent.createEl("div", {
            cls: "focus-tracker__header focus-tracker__row",
        });

        header.createEl("div", {
            text: "",
            cls: "focus-tracker__cell--focus-target-label focus-tracker__cell",
        });
        const focalDate = new Date();
        const lastDate = this.getLastDate();
        let indexDate = lastDate;
        indexDate.setDate(indexDate.getDate() - this.configuration.daysToLoad + 1);
        for (let i = 0; i < this.configuration.daysToLoad; i++) {
            const day = indexDate.getDate().toString();
            let headerLabelEl = header.createEl("div", {
                cls: `focus-tracker__cell focus-tracker__cell--${this.getDayOfWeek(indexDate,)}`,
                text: day,
            });
            // is today
            if (indexDate.toISOString() === focalDate.toISOString()) {
                headerLabelEl.addClass("focus-tracker__cell--today");
            } else if (indexDate >= focalDate) {
                headerLabelEl.addClass("focus-tracker__cell--future");
            }

            indexDate.setDate(indexDate.getDate() + 1);
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

    normalizeLogs(source: { [date: string]: any }): FocusLogsType {
        const result: FocusLogsType = {};
        Object.keys(source).forEach(date => {
            const value = source[date];
            const numValue = Number(value);
            if (isNaN(numValue)) {
                result[date] = !value ? 0 : value.toString();
            } else {
                result[date] = numValue;
            }
        });
        return result;
    }

    async readFocusLogs(path: string): Promise<FocusLogsType> {
        const frontmatter = await this.getFrontmatter(path);
        const fmLogs = frontmatter[this.configuration.logPropertyName] || {};
        return this.normalizeLogs(fmLogs);
    }

    async getFocusTargetLabel(path: string): Promise<string> {
        let focusTargetLabel = path.split('/').pop()?.replace('.md', '') || path;
        if (this.configuration.titlePropertyNames && this.configuration.titlePropertyNames.length > 0) {
            let frontmatter = await this.getFrontmatter(path) || {};
            this.configuration.titlePropertyNames.slice().reverse().forEach( (propertyName: string) => {
                if (frontmatter[propertyName]) {
                    focusTargetLabel = frontmatter[propertyName] || focusTargetLabel;
                }
            });
        }
        return focusTargetLabel;
    }

    async renderFocusLogs(
        path: string,
        focusTargetLabel: string,
        entries: FocusLogsType,
    ): Promise<void> {
        if (!this.configuration.focusTracksGoHere) {
            new Notice(`${PLUGIN_NAME}: missing div that holds all focus tracks`);
            return;
        }
        const parent = this.configuration.focusTracksGoHere;

        let row = parent.querySelector(`*[data-id="${this.pathToId(path)}"]`);

        if (!row) {
            row = this.configuration.focusTracksGoHere.createEl("div", {
                cls: "focus-tracker__row",
            });
            row.setAttribute("data-id", this.pathToId(path));
        } else {
            this.removeAllChildNodes(row as HTMLElement);
        }

        const focusTitle = row.createEl("div", {
            cls: "focus-tracker__cell--focus-target-label focus-tracker__cell",
        });

        const focusTitleLink = focusTitle.createEl("a", {
            text: focusTargetLabel,
            cls: "internal-link",
        });

        focusTitleLink.setAttribute("href", path);
        focusTitleLink.setAttribute("aria-label", path);

        const lastDate = this.getLastDate();
        let indexDate = lastDate;
        indexDate.setDate(indexDate.getDate() - this.configuration.daysToLoad + 1); // todo, why +1?

        for (let i = 0; i < this.configuration.daysToLoad; i++) {
            const dateString: string = this.getDateId(indexDate);
            // const entryValue: number = entries[dateString] || 0;
            const {
                hasValue,
                symbol,
                tooltip,
                entryScalarValue,
            } = this.getDisplayValues(entries[dateString]);
            const focusCell = row.createEl("div", {
                cls: `focus-tracker__cell
                focus-tick
                focus-tick-entry
                focus-tick--${hasValue}
                focus-tracker__cell--${this.getDayOfWeek(indexDate)}`,
                title: tooltip,
            });

            focusCell.setAttribute("ticked", hasValue.toString());

            focusCell.setAttribute("date", dateString);
            focusCell.setAttribute("focusTrackerPath", path);
            focusCell.setAttribute("focusRating", entryScalarValue?.toString() || "");
            focusCell.setText(symbol);

            focusCell.addEventListener("click", (e: MouseEvent) => {
                if (e.altKey) {
                    // Decrement rating on shift-click
                    this.stepFocusLogEntry(focusCell, -1);
                } else {
                    // Increment rating on plain left-click
                    this.stepFocusLogEntry(focusCell, 1);
                }
            });

            // focusCell.addEventListener("mouseover", (event) => {
            //     this._context.app.workspace.trigger("hover-link", {
            //         event,
            //         source: VIEW_TYPE,
            //         hoverParent: focusCell.parentElement,
            //         targetEl: focusCell,
            //         linktext: linkPath,
            //     });
            // });

            focusCell.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                const menu = new Menu()
                this.ratingSymbols.slice().reverse().forEach( (symbol: string, rSymbolIndex: number) => {
                    let symbolIndex = this.configuration.ratingSymbols.length - rSymbolIndex;
                    let newValue = symbolIndex;
                    menu.addItem((item) =>
                        item
                            // .setTitle(`Set rating ${symbolIndex}: ${symbol}`)
                            .setTitle(`${symbol} (rating = ${newValue})`)
                            .setIcon("open")
                            .onClick( async () =>  {
                                await this.setFocusRating(path, dateString, newValue);
                            })
                        )
                });
                menu.addSeparator();
                menu.addItem((item) =>
                                item
                                .setTitle(`Clear`)
                                .setIcon("open")
                                .onClick( async () =>  {
                                    await this.setFocusRating(path, dateString, 0);
                                })
                            )
                menu.addSeparator();
                this.configuration.flagSymbols.forEach( (symbol: string, symbolIndex: number) => {
                // this.configuration.flagSymbols.slice().reverse().forEach( (symbol: string, rSymbolIndex: number) => {
                    // let symbolIndex = this.configuration.flagSymbols.length - rSymbolIndex - 1;
                    let newValue = 0 - (symbolIndex + 1);
                    menu.addItem((item) =>
                                    item
                                    // .setTitle(`Set rating ${index}: ${symbol}`)
                                    .setTitle(`${symbol} (flag = ${newValue})`)
                                    .setIcon("open")
                                    .onClick( async () =>  {
                                        await this.setFocusRating(path, dateString, newValue);
                                    })
                                )
                });
                menu.showAtMouseEvent(event)
            })


            indexDate.setDate(indexDate.getDate() + 1);
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

    // getScaleValue(input: string | number, scale: string[]): number {
    //     if (typeof input === 'string') {
    //         const index = scale.indexOf(input);
    //         return index !== -1 ? index : 0;
    //     } else if (typeof input === 'number') {
    //         return input;
    //     }
    //     return 0; // Default return for unexpected input types
    // }

    getDisplayValues(input: string | number): {
        hasValue: boolean,
        symbol: string,
        tooltip: string,
        entryScalarValue: number | null,
    } {
        let result = {
            hasValue: false,
            symbol: " ",
            tooltip: "",
            entryScalarValue: 0,
        }
        if (typeof input === 'string') {
            if (input === "") {
                result.hasValue = false;
            } else {
                result.hasValue = true;
                result.symbol = input;
                result.tooltip = input;
            }
        } else if (typeof input === 'number') {
            result.entryScalarValue = input
            if (result.entryScalarValue === 0) {
                result.hasValue = false;
            } else {
                result.hasValue = true;
                result.tooltip = `Rating: ${result.entryScalarValue}`;
                let getSymbol = (symbolArray: string[], symbolIndex: number): string => {
                    if (symbolIndex >= symbolArray.length) {
                        return OUT_OF_BOUNDS;
                    } else {
                        return symbolArray[symbolIndex];
                    }
                };
                if (result.entryScalarValue >= 1) {
                    result.symbol = getSymbol(this.configuration.ratingSymbols, result.entryScalarValue - 1);
                } else {
                    result.symbol = getSymbol(this.configuration.flagSymbols, (-1 * result.entryScalarValue) - 1);
                }
            }
        }
        return result;
    }

    async stepFocusLogEntry(
        el: HTMLElement,
        step: number = 1
    ) {
        const focusTrackerPath: string | null = el.getAttribute("focusTrackerPath");
        const date: string | null = el.getAttribute("date");
        const currentValue: number = this.getFocusRatingFromElement(el);
        let newValue: number = 0;
        if (currentValue === 0) {
            newValue = 1;
        } else {
            newValue = (currentValue < 0 ? (0 - currentValue) : currentValue) + 1;
            const maxScaleIndex = currentValue < 0 ? this.flagSymbols.length : this.ratingSymbols.length;
            newValue = newValue > maxScaleIndex ? 0 : newValue;
            newValue = currentValue < 0 ? 0 - newValue : newValue;
        }
        await this.setFocusRating(focusTrackerPath, date, newValue);
    }

    async setFocusRating(focusTrackerPath: string | null, date: string | null, newValue: number) {
        if (!focusTrackerPath || !date) {
            new Notice(`${PLUGIN_NAME}: Missing data attributes for focus tracking.`);
        }
        const file: TAbstractFile | null = this.app.vault.getAbstractFileByPath(focusTrackerPath as string);
        if (!file || !(file instanceof TFile)) {
            new Notice(`${PLUGIN_NAME}: File missing while trying to change focus rating.`);
        }
        this.app.fileManager.processFrontMatter(file as TFile, (frontmatter: { [key: string]: any }) => {
            let entries: { [key: string]: number } = frontmatter[this.configuration.logPropertyName] || {};
            entries[date as string] = newValue;
            const sortedEntriesArray = Object.entries(entries).sort(([date1], [date2]) => new Date(date1).getTime() - new Date(date2).getTime());
            const sortedEntriesObject = Object.fromEntries(sortedEntriesArray);
            frontmatter[this.configuration.logPropertyName] = sortedEntriesObject;
            new Notice(`Setting rating: ${newValue}`, 600);
        });
        let fpath = file?.path || "";
        if (fpath) {
            await this.renderFocusLogs(
                fpath,
                await this.getFocusTargetLabel(fpath),
                await this.readFocusLogs(fpath),

            );
        }
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

