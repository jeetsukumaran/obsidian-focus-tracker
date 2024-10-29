import {
    App,
    parseYaml,
    Notice,
    Menu,
    CachedMetadata,
    TAbstractFile,
    TFile,
} from "obsidian";
import { FocusTrackerSettings } from './FocusTrackerSettingsTab';
import { RemarksModal } from './RemarksModal';
import { FocusLogEntry, FocusLogsType, FocusTrackerConfiguration } from './types';
import {
    DEFAULT_MAPS,
    DEFAULT_CONFIG,
    OUT_OF_BOUNDS,
    PLUGIN_NAME,
    MIN_DAYS_PAST,
    MIN_DAYS_FUTURE
} from './constants';

const DEFAULT_CONFIGURATION = (): FocusTrackerConfiguration => ({
    path: "",
    paths: [],
    properties: {},
    tags: [],
    tagSet: [],
    excludeTags: [], // Added
    excludeTagSet: [], // Added
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
});

const PRIVATE_CONFIGURATION = new Set<string>([
    "rootElement",
    "focusTracksGoHere",
]);

function filterDictionary<T>(
    dictionary: Record<string, T>,
    predicate: (key: string, value: T) => boolean
): Record<string, T> {
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

function normalizeKeys<T>(dictionary: Record<string, T>): Record<string, T> {
    const normalizedDictionary: Record<string, T> = {};
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

// Add settings property to class:
export default class FocusTracker {
    public rootElement: HTMLElement;
    public configuration: FocusTrackerConfiguration;
    public app: App;
    public id: string;
    private settings: FocusTrackerSettings;  // Add this line

    private _ratingSymbols: string[];
    private _flagSymbols: string[];

    // Update constructor:
    constructor(
        src: string,
        el: HTMLElement,
        ctx: any,
        app: App,
        settings: FocusTrackerSettings  // Add settings parameter
    ) {
        this.app = app;
        this.settings = settings;  // Store settings
        this.id = this.generateUniqueId();
        this.configuration = this.loadConfiguration(src);
        this.rootElement = el;
        this.refresh();
    }


    private createBaseStructure() {
        this.rootElement.empty();
        const mainContainer = this.rootElement.createEl("div", {
            cls: "focus-tracker-container",
        });
        const controlsContainer = mainContainer.createEl("div", {
            cls: "focus-tracker__controls",
        });
        const tableContainer = mainContainer.createEl("div", {
            cls: "focus-tracker-table-container",
        });
        const tableElement = tableContainer.createEl("div", {
            cls: "focus-tracker",
        });
        tableElement.setAttribute("id", this.id);
        return { controlsContainer, tableElement };
    }

    public async refresh() {
        const files = this.loadFiles();
        if (files.length === 0) {
            this.renderNoFocussFoundMessage();
            return;
        }

        const { controlsContainer, tableElement } = this.createBaseStructure();
        this.configuration.focusTracksGoHere = tableElement;
        this.renderControls(controlsContainer);
        this.renderTableHeader(tableElement);

        let focalTargetLabels: [string, TFile][] = await Promise.all(
            files.map(async (f) => [await this.getFocusTargetLabel(f.path), f])
        );

        focalTargetLabels.sort((a, b) => a[0].localeCompare(b[0]));

        for (const [focusTargetLabel, f] of focalTargetLabels) {
            const focusLogs = await this.readFocusLogs(f.path);
            await this.renderFocusLogs(f.path, focusTargetLabel, focusLogs);
        }
    }

    private loadFiles(): TFile[] {
        let pathPatterns = patternsToRegex(this.configuration.paths);
        let tagAnyPatterns = patternsToRegex(this.configuration.tags.map(s => s.replace(/^#/,"")));
        let tagSetPatterns = patternsToRegex(this.configuration.tagSet.map(s => s.replace(/^#/,"")));
        let excludeTagPatterns = patternsToRegex((this.configuration.excludeTags || []).map(s => s.replace(/^#/,"")));
        let excludeTagSetPatterns = patternsToRegex((this.configuration.excludeTagSet || []).map(s => s.replace(/^#/,"")));
        let properties = this.configuration.properties;

        return this.app.vault
            .getMarkdownFiles()
            .filter((file: TFile) => {
                let fileMetadata = this.getMetadata(file);
                let frontmatter = fileMetadata?.frontmatter || {};
                let fileTags = this.extractTags(fileMetadata);

                // Path filtering
                if (pathPatterns.length > 0 && !pathPatterns.some(rx => rx.test(file.path))) {
                    return false;
                }

                // Tag-any (OR) filtering
                if (tagAnyPatterns.length > 0 && !tagAnyPatterns.some(rx => fileTags.some(tag => rx.test(tag)))) {
                    return false;
                }

                // Tag-set (AND) filtering
                if (tagSetPatterns.length > 0 && !tagSetPatterns.every(rx => fileTags.some(tag => rx.test(tag)))) {
                    return false;
                }

                // Exclude tags (OR) - exclude if ANY match
                if (excludeTagPatterns.length > 0 && excludeTagPatterns.some(rx => fileTags.some(tag => rx.test(tag)))) {
                    return false;
                }

                // Exclude tag-set (AND) - exclude if ALL match
                if (excludeTagSetPatterns.length > 0 && excludeTagSetPatterns.every(rx => fileTags.some(tag => rx.test(tag)))) {
                    return false;
                }

                // Property filtering
                if (Object.keys(properties).length > 0) {
                    if (!frontmatter) return false;
                    if (!Object.keys(properties).some(key => frontmatter[key] === properties[key])) {
                        return false;
                    }
                }

                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }


    private extractTags(metadata: CachedMetadata | null): string[] {
        if (!metadata) return [];

        const tagSet = new Set<string>();

        // Extract tags from frontmatter
        if (metadata.frontmatter?.tags) {
            const fmTags = metadata.frontmatter.tags;
            if (Array.isArray(fmTags)) {
                fmTags.forEach(tag => {
                    tagSet.add(typeof tag === 'string' ? tag.replace(/^#/, '') : '');
                });
            } else if (typeof fmTags === 'string') {
                fmTags.split(/[,\s]+/).forEach(tag => {
                    tagSet.add(tag.replace(/^#/, ''));
                });
            }
        }

        // Extract inline tags
        if (metadata.tags) {
            metadata.tags.forEach(tag => {
                tagSet.add(tag.tag.replace(/^#/, ''));
            });
        }

        return Array.from(tagSet).filter(tag => tag !== '');
    }

    private getMetadata(file: TFile): CachedMetadata | null {
        return this.app.metadataCache.getFileCache(file) || null;
    }

    private loadConfiguration(configurationString: string): FocusTrackerConfiguration {
        try {
            const parsedConfig = parseYaml(configurationString) || {};
            const normalizedConfig = normalizeKeys(parsedConfig);

            // Use settings for defaults
            const ratingMapKey = parsedConfig['rating-map'] || this.settings.defaultRatingMap;
            const flagMapKey = parsedConfig['flag-map'] || this.settings.defaultFlagMap;

            const ratingMap = DEFAULT_MAPS.ratings[ratingMapKey] ||
                            DEFAULT_MAPS.ratings[this.settings.defaultRatingMap];
            const flagMap = DEFAULT_MAPS.flags[flagMapKey] ||
                            DEFAULT_MAPS.flags[this.settings.defaultFlagMap];

            // Rest of the method remains the same, but use settings for defaults:
            const configuration = {
                ...DEFAULT_CONFIGURATION(),
                ...normalizedConfig,
                ratingSymbols: ratingMap.symbols,
                flagSymbols: flagMap.symbols,
                flagKeys: flagMap.keys,
                daysInPast: Math.max(
                    this.settings.minDaysPast,
                    parsedConfig['days-past'] || this.settings.defaultDaysPast
                ),
                daysInFuture: Math.max(
                    this.settings.minDaysFuture,
                    parsedConfig['days-future'] || this.settings.defaultDaysFuture
                )
            };

            // Rest of the method remains the same
            if (configuration.path && configuration.paths.length === 0) {
                configuration.paths = Array.isArray(configuration.path)
                    ? [...configuration.path]
                    : [String(configuration.path)];
            }

            return configuration;
        } catch (error) {
            new Notice(`${PLUGIN_NAME}: Invalid configuration. Using defaults.`);
            return {
                ...DEFAULT_CONFIGURATION(),
                daysInPast: this.settings.defaultDaysPast,
                daysInFuture: this.settings.defaultDaysFuture
            };
        }
    }

    // private loadConfiguration(configurationString: string): FocusTrackerConfiguration {
    //     try {
    //         const parsedConfig = parseYaml(configurationString) || {};

    //         const normalizedConfig = normalizeKeys(parsedConfig);

    //         // Get rating map from config or use default
    //         const ratingMapKey = parsedConfig['rating-map'] || DEFAULT_CONFIG.ratingMap;
    //         const ratingMap = DEFAULT_MAPS.ratings[ratingMapKey] ||
    //                         DEFAULT_MAPS.ratings[DEFAULT_CONFIG.ratingMap];

    //         // Get flag map from config or use default
    //         const flagMapKey = parsedConfig['flag-map'] || DEFAULT_CONFIG.flagMap;
    //         const flagMap = DEFAULT_MAPS.flags[flagMapKey] ||
    //                     DEFAULT_MAPS.flags[DEFAULT_CONFIG.flagMap];

    //         // Handle custom maps if provided
    //         if (parsedConfig['custom-rating-map']) {
    //             const customMap = parsedConfig['custom-rating-map'];
    //             if (Array.isArray(customMap?.symbols)) {
    //                 ratingMap.symbols = customMap.symbols;
    //             }
    //             if (Array.isArray(customMap?.descriptions)) {
    //                 ratingMap.descriptions = customMap.descriptions;
    //             }
    //         }

    //         if (parsedConfig['custom-flag-map']) {
    //             const customMap = parsedConfig['custom-flag-map'];
    //             if (Array.isArray(customMap?.symbols)) {
    //                 flagMap.symbols = customMap.symbols;
    //             }
    //             if (Array.isArray(customMap?.keys)) {
    //                 flagMap.keys = customMap.keys;
    //             }
    //         }

    //         // Build configuration
    //         const configuration = {
    //             ...DEFAULT_CONFIGURATION(),
    //             ...normalizedConfig,
    //             ratingSymbols: ratingMap.symbols,
    //             flagSymbols: flagMap.symbols,
    //             flagKeys: flagMap.keys,
    //             daysInPast: parsedConfig['days-past'] || DEFAULT_CONFIG.daysPast,
    //             daysInFuture: parsedConfig['days-future'] || DEFAULT_CONFIG.daysFuture,
    //         };

    //         // Handle paths
    //         if (configuration.path && configuration.paths.length === 0) {
    //             configuration.paths = Array.isArray(configuration.path)
    //                 ? [...configuration.path]
    //                 : [String(configuration.path)];
    //         }

    //         return configuration;
    //     } catch (error) {
    //         new Notice(`${PLUGIN_NAME}: Invalid configuration. Using defaults.`);
    //         return DEFAULT_CONFIGURATION();
    //     }
    // }

    private renderControls(parent: HTMLElement): void {
        this.createControlSection(
            parent,
            "Days Past:",
            this.configuration.daysInPast,
            MIN_DAYS_PAST,
            DEFAULT_CONFIG.daysPast,
            (value) => {
                this.configuration.daysInPast = value;
                this.refresh();
            }
        );

        const focalDateSection = parent.createEl("div", {
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
            text: "●",
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

        focalDateInput.onchange = () => {
            this.configuration.focalDate = new Date(focalDateInput.value);
            this.refresh();
        };

        this.createControlSection(
            parent,
            "Days Future:",
            this.configuration.daysInFuture,
            MIN_DAYS_FUTURE,
            DEFAULT_CONFIG.daysFuture,
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

        return section;
    }

    private renderTableHeader(parent: HTMLElement): void {
        const header = parent.createEl("div", {
            cls: "focus-tracker__header focus-tracker__row",
        });

        header.createEl("div", {
            cls: "focus-tracker__cell focus-tracker__cell--focus-target-label",
        });

        this.renderDateCells(header);
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

    private renderNoFocussFoundMessage(): void {
        this.rootElement?.empty();
        this.rootElement?.createEl("div", {
            text: `No files found matching criteria`,
        });
    }

    public get ratingSymbols(): string[] {
        if (!this._ratingSymbols) {
            this._ratingSymbols = [...this.configuration.ratingSymbols];
        }
        return this._ratingSymbols;
    }

    public get flagSymbols(): string[] {
        if (!this._flagSymbols) {
            this._flagSymbols = [...this.configuration.flagSymbols];
        }
        return this._flagSymbols;
    }

    private async getFrontmatter(path: string): Promise<{[key: string]: any}> {
        const file: TAbstractFile|null = this.app.vault.getAbstractFileByPath(path);
        if (!file || !(file instanceof TFile)) {
            new Notice(`${PLUGIN_NAME}: No file found for path: ${path}`);
            return {};
        }

        try {
            const content = await this.app.vault.read(file);
            const frontmatter = content.split("---")[1];
            if (!frontmatter) {
                return {};
            }
            return parseYaml(frontmatter);
        } catch (error) {
            return {};
        }
    }

    private async getFocusTargetLabel(path: string): Promise<string> {
        let focusTargetLabel = path.split('/').pop()?.replace('.md', '') || path;
        if (this.configuration.titlePropertyNames?.length > 0) {
            let frontmatter = await this.getFrontmatter(path) || {};
            this.configuration.titlePropertyNames.slice().reverse().forEach((propertyName: string) => {
                if (frontmatter[propertyName]) {
                    focusTargetLabel = frontmatter[propertyName] || focusTargetLabel;
                }
            });
        }
        return focusTargetLabel;
    }

    private normalizeLogs(source: { [date: string]: any }): FocusLogsType {
        const result: FocusLogsType = {};
        Object.keys(source).forEach(date => {
            const value = source[date];
            if (value === null || value === undefined || value === "") {
                result[date] = { rating: 0 };
            } else if (typeof value === 'object' && 'rating' in value) {
                result[date] = value;
            } else if (typeof value === 'number') {
                result[date] = { rating: value };
            } else if (typeof value === 'string') {
                const numValue = Number(value);
                if (isNaN(numValue)) {
                    result[date] = { rating: 0, remarks: value };
                } else {
                    result[date] = { rating: numValue };
                }
            }
        });
        return result;
    }

    private async readFocusLogs(path: string): Promise<FocusLogsType> {
        const frontmatter = await this.getFrontmatter(path);
        const fmLogs = frontmatter[this.configuration.logPropertyName] || {};
        return this.normalizeLogs(fmLogs);
    }

    private getDisplayValues(entry: number | string | FocusLogEntry): {
        hasValue: boolean,
        symbol: string,
        tooltip: string,
        entryScalarValue: number,
        remarks?: string
    } {
        let result = {
            hasValue: false,
            symbol: " ",
            tooltip: "",
            entryScalarValue: 0,
            remarks: undefined as string | undefined
        };

        if (typeof entry === 'object' && entry !== null) {
            result.entryScalarValue = entry.rating;
            result.remarks = entry.remarks;
        } else if (typeof entry === 'number') {
            result.entryScalarValue = entry;
        } else if (typeof entry === 'string') {
            if (entry === "") {
                result.hasValue = false;
            } else {
                result.hasValue = true;
                result.symbol = entry;
                result.tooltip = entry;
            }
            return result;
        }

        if (result.entryScalarValue === 0) {
            result.hasValue = false;
        } else {
            result.hasValue = true;
            if (result.entryScalarValue >= 1) {
                result.symbol = this.getSymbol(this.configuration.ratingSymbols, result.entryScalarValue - 1);
                result.tooltip = `Rating: ${result.entryScalarValue}`;
            } else {
                let arrayIndex = (-1 * result.entryScalarValue) - 1;
                result.symbol = this.getSymbol(this.configuration.flagSymbols, arrayIndex);
                let flagKey = this.configuration.flagKeys?.[arrayIndex];
                let flagDesc = flagKey ? `: ${flagKey}` : "";
                result.tooltip = `Flag ${-1 * result.entryScalarValue}${flagDesc}`;
            }
        }

        // Enhanced tooltip formatting
        if (result.remarks) {
            result.tooltip = result.hasValue ?
                `${result.tooltip}\n───────────\n${result.remarks}` :
                result.remarks;
        }

        return result;
    }

    // private getDisplayValues(entry: number | string | FocusLogEntry): {
    //     hasValue: boolean,
    //     symbol: string,
    //     tooltip: string,
    //     entryScalarValue: number,
    //     remarks?: string
    // } {
    //     let result = {
    //         hasValue: false,
    //         symbol: " ",
    //         tooltip: "",
    //         entryScalarValue: 0,
    //         remarks: undefined as string | undefined
    //     };

    //     if (typeof entry === 'object' && entry !== null) {
    //         result.entryScalarValue = entry.rating;
    //         result.remarks = entry.remarks;
    //     } else if (typeof entry === 'number') {
    //         result.entryScalarValue = entry;
    //     } else if (typeof entry === 'string') {
    //         if (entry === "") {
    //             result.hasValue = false;
    //         } else {
    //             result.hasValue = true;
    //             result.symbol = entry;
    //             result.tooltip = entry;
    //         }
    //         return result;
    //     }

    //     if (result.entryScalarValue === 0) {
    //         result.hasValue = false;
    //     } else {
    //         result.hasValue = true;
    //         if (result.entryScalarValue >= 1) {
    //             result.symbol = this.getSymbol(this.configuration.ratingSymbols, result.entryScalarValue - 1);
    //             result.tooltip = `Rating: ${result.entryScalarValue}`;
    //         } else {
    //             let arrayIndex = (-1 * result.entryScalarValue) - 1;
    //             result.symbol = this.getSymbol(this.configuration.flagSymbols, arrayIndex);
    //             let flagKey = this.configuration.flagKeys?.[arrayIndex];
    //             let flagDesc = flagKey ? `: ${flagKey}` : "";
    //             result.tooltip = `Flag ${-1 * result.entryScalarValue}${flagDesc}`;
    //         }
    //     }

    //     if (result.remarks) {
    //         result.tooltip += `\nRemarks: ${result.remarks}`;
    //     }

    //     return result;
    // }

    private getSymbol(symbolArray: string[], symbolIndex: number): string {
        return symbolIndex >= symbolArray.length ? OUT_OF_BOUNDS : symbolArray[symbolIndex];
    }

    private async stepFocusLogEntry(
        el: HTMLElement,
        step: number = 1
    ) {
        const focusTrackerPath = el.getAttribute("focusTrackerPath");
        const date = el.getAttribute("date");
        const currentValue = this.getFocusRatingFromElement(el);

        let newValue = 0;
        if (currentValue === 0) {
            newValue = 1;
        } else {
            newValue = (currentValue < 0 ? (0 - currentValue) : currentValue) + 1;
            const maxScaleIndex = currentValue < 0 ? this.flagSymbols.length : this.ratingSymbols.length;
            newValue = newValue > maxScaleIndex ? 0 : newValue;
            newValue = currentValue < 0 ? 0 - newValue : newValue;
        }

        await this.setFocusEntry(focusTrackerPath, date, newValue);
    }

    private getFocusRatingFromElement(el: HTMLElement): number {
        const attrValue = el.getAttribute("focusRating");
        if (!attrValue || attrValue === null || attrValue.trim() === "") {
            return 0;
        }
        const numValue = Number(attrValue);
        return isNaN(numValue) || numValue === 0 ? 0 : numValue;
    }


    private showFocusMenu(event: MouseEvent, path: string, dateString: string, currentRemarks?: string): void {
        const menu = new Menu();

        // Remarks section
        menu.addItem((item) =>
            item
                .setTitle(currentRemarks ? `Edit Remarks: ${currentRemarks}` : "Add Remarks")
                .setIcon("edit")
                .onClick(() => {
                    new RemarksModal(
                        this.app,
                        currentRemarks || "",
                        async (result) => {
                            await this.setFocusEntry(path, dateString, undefined, result);
                        }
                    ).open();
                })
        );

        menu.addSeparator();

        // Rating options
        this.ratingSymbols.slice().reverse().forEach((symbol: string, rSymbolIndex: number) => {
            let symbolIndex = this.configuration.ratingSymbols.length - rSymbolIndex;
            menu.addItem((item) =>
                item
                    .setTitle(`${symbol} (Rating = ${symbolIndex})`)
                    .setIcon("check-circle")
                    .onClick(async () => {
                        await this.setFocusEntry(path, dateString, symbolIndex);
                    })
            );
        });

        // Clear option
        menu.addSeparator();
        menu.addItem((item) =>
            item
                .setTitle("Clear Rating")
                .setIcon("x-circle")
                .onClick(async () => {
                    await this.setFocusEntry(path, dateString, 0);
                })
        );

        // Flag options
        menu.addSeparator();
        this.configuration.flagSymbols.forEach((symbol: string, symbolIndex: number) => {
            let newValue = 0 - (symbolIndex + 1);
            let flagKey = this.configuration.flagKeys?.[symbolIndex];
            let flagDesc = flagKey ? `: ${flagKey}` : "";
            menu.addItem((item) =>
                item
                    .setTitle(`${symbol} (Flag ${-1 * newValue}${flagDesc})`)
                    .setIcon("flag")
                    .onClick(async () => {
                        await this.setFocusEntry(path, dateString, newValue);
                    })
            );
        });

        // Position and show the menu
        menu.showAtMouseEvent(event);
    }

    // private showFocusMenu(event: MouseEvent, path: string, dateString: string, currentRemarks?: string): void {
    //     const menu = new Menu();

    //     // Remarks section
    //     menu.addItem((item) =>
    //         item
    //             .setTitle(currentRemarks ? `Edit Remarks: ${currentRemarks}` : "Add Remarks")
    //             .setIcon("edit")
    //             .onClick(async () => {
    //                 const remarkInput = document.createElement('input');
    //                 remarkInput.type = 'text';
    //                 remarkInput.value = currentRemarks || '';
    //                 remarkInput.placeholder = 'Enter remarks...';

    //                 const modalDiv = document.createElement('div');
    //                 modalDiv.addClass('focus-tracker-remarks-modal');
    //                 modalDiv.appendChild(remarkInput);

    //                 const saveRemarks = async () => {
    //                     await this.setFocusEntry(path, dateString, undefined, remarkInput.value);
    //                     modalDiv.remove();
    //                 };

    //                 remarkInput.addEventListener('keypress', async (e) => {
    //                     if (e.key === 'Enter') {
    //                         await saveRemarks();
    //                     }
    //                 });

    //                 document.body.appendChild(modalDiv);
    //                 remarkInput.focus();
    //             })
    //     );

    //     menu.addSeparator();

    //     // Rating options
    //     this.ratingSymbols.slice().reverse().forEach((symbol: string, rSymbolIndex: number) => {
    //         let symbolIndex = this.configuration.ratingSymbols.length - rSymbolIndex;
    //         menu.addItem((item) =>
    //             item
    //                 .setTitle(`${symbol} (Rating = ${symbolIndex})`)
    //                 .setIcon("open")
    //                 .onClick(async () => {
    //                     await this.setFocusEntry(path, dateString, symbolIndex);
    //                 })
    //         );
    //     });

    //     menu.addSeparator();
    //     menu.addItem((item) =>
    //         item
    //             .setTitle(`Clear`)
    //             .setIcon("open")
    //             .onClick(async () => {
    //                 await this.setFocusEntry(path, dateString, 0);
    //             })
    //     );

    //     menu.addSeparator();
    //     this.configuration.flagSymbols.forEach((symbol: string, symbolIndex: number) => {
    //         let newValue = 0 - (symbolIndex + 1);
    //         let flagKey = this.configuration.flagKeys?.[symbolIndex];
    //         let flagDesc = flagKey ? `: ${flagKey}` : "";
    //         menu.addItem((item) =>
    //             item
    //                 .setTitle(`${symbol} (Flag ${-1 * newValue}${flagDesc})`)
    //                 .setIcon("open")
    //                 .onClick(async () => {
    //                     await this.setFocusEntry(path, dateString, newValue);
    //                 })
    //         );
    //     });

    //     menu.showAtMouseEvent(event);
    // }

    private async setFocusEntry(
        focusTrackerPath: string | null,
        date: string | null,
        newRating?: number,
        remarks?: string
    ) {
        if (!focusTrackerPath || !date) {
            new Notice(`${PLUGIN_NAME}: Missing data attributes for focus tracking.`);
            return;
        }

        const file = this.app.vault.getAbstractFileByPath(focusTrackerPath);
        if (!file || !(file instanceof TFile)) {
            new Notice(`${PLUGIN_NAME}: File missing while trying to change focus rating.`);
            return;
        }

        await this.app.fileManager.processFrontMatter(file, (frontmatter: { [key: string]: any }) => {
            let entries = frontmatter[this.configuration.logPropertyName] || {};
            const currentEntry = entries[date];
            let newEntry: FocusLogEntry;

            if (typeof currentEntry === 'object' && currentEntry !== null) {
                newEntry = { ...currentEntry };
            } else if (typeof currentEntry === 'number') {
                newEntry = { rating: currentEntry };
            } else {
                newEntry = { rating: 0 };
            }

            if (newRating !== undefined) {
                newEntry.rating = newRating;
            }
            if (remarks !== undefined) {
                if (remarks.trim() === '') {
                    delete newEntry.remarks;
                } else {
                    newEntry.remarks = remarks.trim();
                }
            }

            entries[date] = newEntry;

            const sortedEntriesArray = Object.entries(entries)
                .sort(([date1], [date2]) => new Date(date1).getTime() - new Date(date2).getTime());

            frontmatter[this.configuration.logPropertyName] = Object.fromEntries(sortedEntriesArray);
            new Notice(`Updated focus entry for ${date}`, 600);
        });

        await this.renderFocusLogs(
            focusTrackerPath,
            await this.getFocusTargetLabel(focusTrackerPath),
            await this.readFocusLogs(focusTrackerPath)
        );
    }

private async renderFocusLogs(
        path: string,
        focusTargetLabel: string,
        entries: FocusLogsType
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
            cls: "focus-tracker__cell focus-tracker__cell--focus-target-label",
        });

        const focusTitleLink = focusTitle.createEl("a", {
            text: focusTargetLabel,
            cls: "internal-link focus-title-link",
        });
        focusTitleLink.setAttribute("href", path);
        focusTitleLink.setAttribute("aria-label", path);

        let startDate = new Date(this.configuration.focalDate);
        startDate.setDate(startDate.getDate() - this.configuration.daysInPast);

        for (let i = 0; i < (this.configuration.daysInPast + this.configuration.daysInFuture + 1); i++) {
            const dateString = this.getDateId(startDate);
            const entry = entries[dateString];
            const {
                hasValue,
                symbol,
                tooltip,
                entryScalarValue,
                remarks
            } = this.getDisplayValues(entry);

            const focusCell = row.createEl("div", {
                cls: `focus-tracker__cell focus-tick focus-tick-entry focus-tick--${hasValue} focus-tracker__cell--${this.getDayOfWeek(startDate)}`,
                title: tooltip,
            });

            focusCell.setAttribute("ticked", hasValue.toString());
            focusCell.setAttribute("date", dateString);
            focusCell.setAttribute("focusTrackerPath", path);
            focusCell.setAttribute("focusRating", entryScalarValue?.toString() || "");
            if (remarks) {
                focusCell.setAttribute("focusRemarks", remarks);
            }
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
                this.showFocusMenu(event, path, dateString, remarks);
            });

            if (this.isSameDate(startDate, this.configuration.focalDate)) {
                focusCell.addClass("focus-tracker__cell--today");
            } else if (startDate > this.configuration.focalDate) {
                focusCell.addClass("focus-tracker__cell--future");
            }

            startDate.setDate(startDate.getDate() + 1);
        }
    }

    private isSameDate(date1: Date, date2: Date): boolean {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    private removeAllChildNodes(parent: HTMLElement): void {
        while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
        }
    }

    private pathToId(path: string): string {
        return path
            .replace(/\//g, "_")
            .replace(/\./g, "__")
            .replace(/ /g, "___");
    }

    private getDateId(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    private getDayOfWeek(date: Date): string {
        const daysOfWeek = [
            "sunday", "monday", "tuesday", "wednesday",
            "thursday", "friday", "saturday"
        ];
        return daysOfWeek[date.getDay()].toLowerCase();
    }

    private generateUniqueId(): string {
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 10000);
        return `focustracker-${timestamp}-${randomNum}`;
    }
}
