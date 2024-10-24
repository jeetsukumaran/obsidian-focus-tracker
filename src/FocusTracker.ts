import {
    App,
    parseYaml,
    Notice,
    Menu,
    CachedMetadata,
    TAbstractFile,
    FrontMatterCache,
    TFile,
    Vault,
    normalizePath,
} from "obsidian";

const PLUGIN_NAME = "Focus Tracker";
const DAYS_TO_SHOW = 21;
const DAYS_TO_LOAD = DAYS_TO_SHOW + 1;
const ratingSymbols = {
    "colors1": ["🔴", "🟠", "🟡", "🟢", "🔵",],
    "digitsOpen": ["➀", "➁", "➂", "➃", "➄", "➅", "➆", "➇", "➈", "➉",],
    "digitsFilled": ["➊","➋","➌","➍","➎","➏","➐","➑","➒","➓",],
    "moonPhases": ["🌑", "🌒", "🌓", "🌔", "🌕"],
}

const flagSymbols = {
    "default": [
        "🚀",
        "🎯",
        "📅",
        "⏳",
        "🏁",
        "🚩",
        "⚠️",
        "🚧",
        "🐂",
    ],
}

const flagKeys = {
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
    ],
}

const SCALE1 = ratingSymbols["colors1"];
const SCALE2 = flagSymbols["default"];
const FLAG_KEYS = flagKeys["default"];

const OUT_OF_BOUNDS = "❗";
const UNKNOWN_RATING = "❓";

export type FocusLogsType = {
    [date: string]: number | string;
};

interface FocusTrackerConfiguration {
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

const DEFAULT_CONFIGURATION = (): FocusTrackerConfiguration => ({
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
    daysInPast: 14,
    daysInFuture: 14,
    focalDate: new Date(),
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

function patternsToRegex(patterns: string[]): RegExp[] {
    return patterns.map((pattern: string) => {
        return new RegExp(".*" + pattern + ".*");
    });
}

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
    const oneDay = 24 * 60 * 60 * 1000;

    const diffInTime = Math.abs(end.getTime() - start.getTime());
    const diffInDays = Math.round(diffInTime / oneDay);

    return diffInDays;
}

export function getMetadata(
    app: App,
    filePathOrFile?: string | TFile,
): CachedMetadata | null {
    let file: TFile | undefined;

    if (typeof filePathOrFile === 'string') {
        file = app.vault.getAbstractFileByPath(normalizePath(filePathOrFile)) as TFile;
    } else if (filePathOrFile instanceof TFile) {
        file = filePathOrFile;
    }

    if (!file) {
        return null;
    }

    return app.metadataCache.getFileCache(file) || null;
}

export function extractTags(metadata: CachedMetadata | null): string[] {
    if (metadata === null) {
        return [];
    }
    const tagSet = new Set<string>();

    if (metadata.tags) {
        metadata.tags.forEach((tag) => {
            tagSet.add(tag.tag.replace(/^#/,""));
        });
    }

    if (metadata.frontmatter && Array.isArray(metadata.frontmatter.tags)) {
        metadata.frontmatter.tags.forEach((tag: string) => {
            tagSet.add(tag);
        });
    }

    return Array.from(tagSet);
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
        const files = this.loadFiles();
        if (files.length === 0) {
            this.renderNoFocussFoundMessage();
            return;
        }

        // Clear the root element
        this.rootElement.empty();

        // Create the main container
        const focusTrackerContainer = this.rootElement.createEl("div", {
            cls: "focus-tracker-container",
        });

        // Add controls section as a separate container
        const controlsContainer = focusTrackerContainer.createEl("div", {
            cls: "focus-tracker__controls-container",
        });
        this.renderControls(controlsContainer);

        // Create table container
        const tableContainer = focusTrackerContainer.createEl("div", {
            cls: "focus-tracker-table-container",
        });

        // Initialize the table and store reference
        this.configuration.focusTracksGoHere = this.initializeTable(tableContainer);

        // Process and render focus logs
        let focalTargetLabels: [string, TFile][] = await Promise.all(files.map(async (f) => {
            return [await this.getFocusTargetLabel(f.path), f];
        }));

        focalTargetLabels.sort((a, b) => a[0].localeCompare(b[0]));

        for (const [focusTargetLabel, f] of focalTargetLabels) {
            const focusLogs = await this.readFocusLogs(f.path);
            await this.renderFocusLogs(
                f.path,
                focusTargetLabel,
                focusLogs
            );
        }
    }

    private initializeTable(container: HTMLElement): HTMLElement {
        // Create the table element with a unique id
        const tableElement = container.createEl("div", {
            cls: "focus-tracker",
        });
        tableElement.setAttribute("id", this.id);

        // Add table header
        this.renderTableHeader(tableElement);

        return tableElement;
    }

    private renderTableHeader(parent: HTMLElement): void {
        // Create header row
        const headerRow = parent.createEl("div", {
            cls: "focus-tracker__header focus-tracker__row",
        });

        // Add label column header
        headerRow.createEl("div", {
            cls: "focus-tracker__cell focus-tracker__cell--focus-target-label",
            text: "", // Empty cell for alignment with focus target labels
        });

        // Render date cells in header
        this.renderDateCells(headerRow);
    }



    loadFiles(): TFile[] {
        let pathPatterns = patternsToRegex(this.configuration.paths);
        let tagAnyPatterns = patternsToRegex(this.configuration.tags.map( (s: string) => s.replace(/^#/,"")));
        let tagSetPatterns = patternsToRegex(this.configuration.tagSet.map( (s: string) => s.replace(/^#/,"")));
        let properties = this.configuration.properties;
        let rval = this.app.vault
            .getMarkdownFiles()
            .filter((file: TFile) => {
                let fileMetadata = getMetadata(this.app, file);
                let frontmatter = fileMetadata?.frontmatter || {};
                let fileTags = extractTags(fileMetadata);
                if (pathPatterns && pathPatterns.length > 0) {
                    let passCriteria = pathPatterns.some( (rx: RegExp) => rx.test(file.path) );
                    if (!passCriteria) {
                        return false;
                    }
                }
                if (tagAnyPatterns && tagAnyPatterns.length > 0) {
                    let passCriteria = tagAnyPatterns.some((rx: RegExp) => fileTags.some((tag: string) => rx.test(tag)));
                    if (!passCriteria) {
                        return false;
                    }
                }
                if (tagSetPatterns && tagSetPatterns.length > 0) {
                    let passCriteria = tagSetPatterns.every((rx: RegExp) => fileTags.some((tag: string) => rx.test(tag)));
                    if (!passCriteria) {
                        return false;
                    }
                }
                if (properties && Object.keys(properties).length > 0) {
                    if (!frontmatter) {
                        return false;
                    }
                    let passCriteria = Object.keys(properties).some(key => {
                        let value = properties[key];
                        return frontmatter[key] === value;
                    });
                    if (!passCriteria) {
                        return false;
                    }
                }
                return file;
            })
            .sort((a: TFile, b: TFile) => a.name.localeCompare(b.name));
        return rval;
    }

    loadConfiguration(configurationString: string): FocusTrackerConfiguration {
        try {
            let configuration = Object.assign(
                {},
                DEFAULT_CONFIGURATION(),
                filterDictionary(normalizeKeys(parseYaml(configurationString)), (key, value) => {
                    return !PRIVATE_CONFIGURATION.has(key);
                }),
            );
            if (configuration.path && configuration.paths.length === 0) {
                if (Array.isArray(configuration.path)) {
                    configuration.paths = [ ... configuration.path]
                } else {
                    configuration.paths = [String(configuration.paths)];
                }
            }
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
            text: `No files found matching criteria`,
        });
    }

    // renderRoot(parent: HTMLElement): HTMLElement {
    //     const rootElement = parent.createEl("div", {
    //         cls: "focus-tracker",
    //     });
    //     rootElement.setAttribute("id", this.id);
    //     return rootElement;
    // }

    // renderHeader(parent: HTMLElement): void {
    //     const header = parent.createEl("div", {
    //         cls: "focus-tracker__header focus-tracker__row",
    //     });

    //     // Label cell for alignment with focus target labels
    //     header.createEl("div", {
    //         cls: "focus-tracker__cell focus-tracker__cell--focus-target-label",
    //     });

    //     // Render date cells
    //     this.renderDateCells(header);
    // }

renderControls(parent: HTMLElement): void {
    const controlsContainer = parent.createEl("div", {
        cls: "focus-tracker__controls",
    });

    // Past Days Section
    this.createControlSection(
        controlsContainer,
        "Days Past:",
        this.configuration.daysInPast,
        1,
        14,
        (value) => {
            this.configuration.daysInPast = value;
            this.refresh();
        }
    );

    // Focal Date Section
    const focalDateSection = controlsContainer.createEl("div", {
        cls: "focus-tracker__control-section",
    });

    focalDateSection.createEl("span", {
        text: "Focal Date:",
        cls: "focus-tracker__control-label",
    });

    const focalDateInput = focalDateSection.createEl("input", {
        type: "date",
        value: this.configuration.focalDate.toISOString().split("T")[0],
        cls: "focus-tracker__focal-date",
    });

    const dateControls = focalDateSection.createEl("div", {
        cls: "focus-tracker__date-controls",
    });

    const decrementDateBtn = dateControls.createEl("button", {
        text: "◀",
        cls: "focus-tracker__btn-date",
    });

    const todayBtn = dateControls.createEl("button", {
        text: "Today",
        cls: "focus-tracker__btn-today",
    });

    const incrementDateBtn = dateControls.createEl("button", {
        text: "▶",
        cls: "focus-tracker__btn-date",
    });

    decrementDateBtn.onclick = () => {
        this.configuration.focalDate.setDate(this.configuration.focalDate.getDate() - 1);
        focalDateInput.value = this.configuration.focalDate.toISOString().split("T")[0];
        this.refresh();
    };

    incrementDateBtn.onclick = () => {
        this.configuration.focalDate.setDate(this.configuration.focalDate.getDate() + 1);
        focalDateInput.value = this.configuration.focalDate.toISOString().split("T")[0];
        this.refresh();
    };

    todayBtn.onclick = () => {
        this.configuration.focalDate = new Date();
        focalDateInput.value = this.configuration.focalDate.toISOString().split("T")[0];
        this.refresh();
    };

    focalDateInput.onchange = (event) => {
        this.configuration.focalDate = new Date(focalDateInput.value);
        this.refresh();
    };

    // Future Days Section
    this.createControlSection(
        controlsContainer,
        "Days Future:",
        this.configuration.daysInFuture,
        1,
        14,
        (value) => {
            this.configuration.daysInFuture = value;
            this.refresh();
        }
    );
}

private createControlSection(
        parent: HTMLElement,
        label: string,
        initialValue: number,
        minValue: number,
        defaultValue: number,
        onChange: (value: number) => void
    ): HTMLElement {
        const section = parent.createEl("div", {
            cls: "focus-tracker__control-section",
        });

        section.createEl("span", {
            text: label,
            cls: "focus-tracker__control-label",
        });

        const input = section.createEl("input", {
            type: "number",
            value: initialValue.toString(),
            cls: "focus-tracker__days-input",
        });
        input.setAttribute("min", minValue.toString());

        const decrementBtn = section.createEl("button", {
            text: "-",
            cls: "focus-tracker__btn-decrement",
        });

        const incrementBtn = section.createEl("button", {
            text: "+",
            cls: "focus-tracker__btn-increment",
        });

        const resetBtn = section.createEl("button", {
            text: "Reset",
            cls: "focus-tracker__btn-reset",
        });

        input.onchange = () => {
            const newValue = Math.max(minValue, parseInt(input.value));
            input.value = newValue.toString();
            onChange(newValue);
        };

        decrementBtn.onclick = () => {
            if (parseInt(input.value) > minValue) {
                input.value = (parseInt(input.value) - 1).toString();
                onChange(parseInt(input.value));
            }
        };

        incrementBtn.onclick = () => {
            input.value = (parseInt(input.value) + 1).toString();
            onChange(parseInt(input.value));
        };

        resetBtn.onclick = () => {
            input.value = defaultValue.toString();
            onChange(defaultValue);
        };

        return section;
    }

    private renderDateCells(header: HTMLElement): void {
        const totalDays = this.configuration.daysInPast + this.configuration.daysInFuture + 1;

        let currentDate = new Date(this.configuration.focalDate);
        currentDate.setDate(currentDate.getDate() - this.configuration.daysInPast);

        for (let i = 0; i < totalDays; i++) {
            const day = currentDate.getDate().toString();
            const cellEl = header.createEl("div", {
                cls: `focus-tracker__cell focus-tracker__cell--${this.getDayOfWeek(currentDate)}`,
                text: day,
            });

            if (this.isSameDate(currentDate, this.configuration.focalDate)) {
                cellEl.addClass("focus-tracker__cell--today");
            } else if (currentDate > this.configuration.focalDate) {
                cellEl.addClass("focus-tracker__cell--future");
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }
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
            this.configuration.titlePropertyNames.slice().reverse().forEach((propertyName: string) => {
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
            cls: "internal-link focus-title-link",
        });

        focusTitleLink.setAttribute("href", path);
        focusTitleLink.setAttribute("aria-label", path);

        // Calculate date range based on focal date and past/future days
        let startDate = new Date(this.configuration.focalDate);
        startDate.setDate(startDate.getDate() - this.configuration.daysInPast);

        for (let i = 0; i < (this.configuration.daysInPast + this.configuration.daysInFuture + 1); i++) {
            const dateString: string = this.getDateId(startDate);
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
                focus-tracker__cell--${this.getDayOfWeek(startDate)}`,
                title: tooltip,
            });

            focusCell.setAttribute("ticked", hasValue.toString());
            focusCell.setAttribute("date", dateString);
            focusCell.setAttribute("focusTrackerPath", path);
            focusCell.setAttribute("focusRating", entryScalarValue?.toString() || "");
            focusCell.setText(symbol);

            focusCell.addEventListener("click", (e: MouseEvent) => {
                if (e.altKey) {
                    this.stepFocusLogEntry(focusCell, -1);
                } else {
                    this.stepFocusLogEntry(focusCell, 1);
                }
            });

            focusCell.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                const menu = new Menu();
                this.ratingSymbols.slice().reverse().forEach((symbol: string, rSymbolIndex: number) => {
                    let symbolIndex = this.configuration.ratingSymbols.length - rSymbolIndex;
                    let newValue = symbolIndex;
                    menu.addItem((item) =>
                        item
                            .setTitle(`${symbol} (Rating = ${newValue})`)
                            .setIcon("open")
                            .onClick(async () => {
                                await this.setFocusRating(path, dateString, newValue);
                            })
                    );
                });

                menu.addSeparator();
                menu.addItem((item) =>
                    item
                        .setTitle(`Clear`)
                        .setIcon("open")
                        .onClick(async () => {
                            await this.setFocusRating(path, dateString, 0);
                        })
                );

                menu.addSeparator();
                this.configuration.flagSymbols.forEach((symbol: string, symbolIndex: number) => {
                    let newValue = 0 - (symbolIndex + 1);
                    let flagKey = this.configuration.flagKeys?.[symbolIndex];
                    let flagDesc = flagKey ? `: ${flagKey}` : "";
                    let title = `${symbol} (Flag ${-1 * newValue}${flagDesc})`;
                    menu.addItem((item) =>
                        item
                            .setTitle(title)
                            .setIcon("open")
                            .onClick(async () => {
                                await this.setFocusRating(path, dateString, newValue);
                            })
                    );
                });
                menu.showAtMouseEvent(event);
            });

            startDate.setDate(startDate.getDate() + 1);
        }
    }

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
            result.entryScalarValue = input;
            if (result.entryScalarValue === 0) {
                result.hasValue = false;
            } else {
                result.hasValue = true;
                let getSymbol = (symbolArray: string[], symbolIndex: number): string => {
                    if (symbolIndex >= symbolArray.length) {
                        return OUT_OF_BOUNDS;
                    } else {
                        return symbolArray[symbolIndex];
                    }
                };
                if (result.entryScalarValue >= 1) {
                    result.symbol = getSymbol(this.configuration.ratingSymbols, result.entryScalarValue - 1);
                    result.tooltip = `Rating: ${result.entryScalarValue}`;
                } else {
                    let arrayIndex = (-1 * result.entryScalarValue) - 1;
                    result.symbol = getSymbol(this.configuration.flagSymbols, arrayIndex);
                    let flagKey = this.configuration.flagKeys?.[arrayIndex];
                    let flagDesc = flagKey ? `: ${flagKey}` : "";
                    result.tooltip = `Flag ${-1 * result.entryScalarValue}${flagDesc}`;
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

    getFocusRatingFromElement(el: HTMLElement): number {
        const attrValue = el.getAttribute("focusRating");
        if (!attrValue || attrValue === null || attrValue.trim() === "") {
            return 0;
        }
        const numValue = Number(attrValue);
        return isNaN(numValue) || numValue === 0 ? 0 : numValue;
    }

    async setFocusRating(focusTrackerPath: string | null, date: string | null, newValue: number) {
        if (!focusTrackerPath || !date) {
            new Notice(`${PLUGIN_NAME}: Missing data attributes for focus tracking.`);
            return;
        }

        const file: TAbstractFile | null = this.app.vault.getAbstractFileByPath(focusTrackerPath);
        if (!file || !(file instanceof TFile)) {
            new Notice(`${PLUGIN_NAME}: File missing while trying to change focus rating.`);
            return;
        }

        await this.app.fileManager.processFrontMatter(file, (frontmatter: { [key: string]: any }) => {
            let entries: { [key: string]: number } = frontmatter[this.configuration.logPropertyName] || {};
            entries[date] = newValue;
            const sortedEntriesArray = Object.entries(entries)
                .sort(([date1], [date2]) => new Date(date1).getTime() - new Date(date2).getTime());
            const sortedEntriesObject = Object.fromEntries(sortedEntriesArray);
            frontmatter[this.configuration.logPropertyName] = sortedEntriesObject;
            new Notice(`Setting rating: ${newValue}`, 600);
        });

        let fpath = file.path;
        await this.renderFocusLogs(
            fpath,
            await this.getFocusTargetLabel(fpath),
            await this.readFocusLogs(fpath),
        );
    }

    private isSameDate(date1: Date, date2: Date): boolean {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
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

    getDateId(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
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
        const randomNum = Math.floor(Math.random() * 10000);
        return `focustracker-${timestamp}-${randomNum}`;
    }
}




