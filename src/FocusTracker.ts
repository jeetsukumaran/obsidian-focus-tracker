import { App, Notice, TFile, MarkdownRenderer, MarkdownRenderChild, Menu } from "obsidian";
import { FileService } from './services/FileService';
import { SortingService } from './services/SortingService';
import { FocusTrackerControls } from './components/FocusTrackerControls';
import { FocusTrackerHeader } from './components/FocusTrackerHeader';
import { FocusTrackerConfiguration, FocusTrackerSettings, FocusLogsType, FocusLogEntry } from './types';
import { DEFAULT_CONFIGURATION } from './config/defaults';
import { RemarksModal } from './components/RemarksModal';
import { FlagsModal } from './components/FlagsModal';
import { isSameDate } from './utils/dates';
import { generateUniqueId, normalizeKeys, pathToId, parseLink } from './utils/strings';
import { ensureFrontmatterValueString } from './utils/formatting';
import { parseYaml } from 'obsidian';
import { PLUGIN_NAME, DEFAULT_MAPS, DEFAULT_CONFIG, OUT_OF_BOUNDS } from './constants';

function normalizeFlags(flags: any): (string | [string, string])[] {
  // Handle null or undefined flags. The `== null` check covers both.
  if (flags == null) {
    return [];
  }

  // Handle arrays
  if (Array.isArray(flags)) {
    return flags.map(item => {
      // Handle tuple case
      if (Array.isArray(item) && item.length === 2) {
        return [String(item[0]), String(item[1])] as [string, string];
      }
      // Legacy case: single string
      return String(item);
    });
  }

  // Handle objects - convert to tuple format
  if (typeof flags === 'object') {
    return Object.entries(flags).map(([key, value]) => [key, String(value)] as [string, string]);
  }

  // Handle scalar values (number, string, boolean, etc.)
  return [String(flags)];
}

export default class FocusTracker {
    private fileService: FileService;
    private sortingService: SortingService;
    private controls: FocusTrackerControls;
    private header: FocusTrackerHeader;
    public configuration: FocusTrackerConfiguration;
    public id: string;
    public rootElement: HTMLElement;
    private _ratingSymbols: string[];
    private _preFlagSymbols: (string | [string, string])[];
    private _postFlagSymbols: (string | [string, string])[];

    constructor(
        src: string,
        el: HTMLElement,
        ctx: any,
        private app: App,
        private settings: FocusTrackerSettings
    ) {
        this.id = generateUniqueId();
        this.fileService = new FileService(app);
        this.sortingService = new SortingService(this.fileService);
        this.configuration = this.loadConfiguration(src);
        this.controls = new FocusTrackerControls(app, () => this.refresh());
        this.header = new FocusTrackerHeader(this.configuration, () => this.refresh());
        this.rootElement = el;
        this.refresh();
    }

    private loadConfiguration(configurationString: string): FocusTrackerConfiguration {
        try {
            const parsedConfig = parseYaml(configurationString) || {};
            const normalizedConfig = normalizeKeys(parsedConfig);

            // Handle prefix and postfix columns with dictionary format
            let prefixColumns = this.processColumnConfig(parsedConfig['prefix-columns']);
            let infixColumns = this.processColumnConfig(parsedConfig['infix-columns']);
            let postfixColumns = this.processColumnConfig(parsedConfig['postfix-columns']);

            const ratingMapKey = parsedConfig['rating-map'] || this.settings.defaultRatingMap;

            const ratingMap = DEFAULT_MAPS.ratings[ratingMapKey] ||
                            DEFAULT_MAPS.ratings[this.settings.defaultRatingMap];

            return {
                ...DEFAULT_CONFIGURATION(),
                ...normalizedConfig,
                prefixColumns,
                infixColumns,
                postfixColumns,
                ratingSymbols: ratingMap.symbols,
                daysInPast: Math.max(
                    this.settings.minDaysPast,
                    parsedConfig['days-past'] || this.settings.defaultDaysPast
                ),
                daysInFuture: Math.max(
                    this.settings.minDaysFuture,
                    parsedConfig['days-future'] || this.settings.defaultDaysFuture
                )
            };
        } catch (error) {
            new Notice(`${PLUGIN_NAME}: Invalid configuration. Using defaults.`);
            return {
                ...DEFAULT_CONFIGURATION(),
                daysInPast: this.settings.defaultDaysPast,
                daysInFuture: this.settings.defaultDaysFuture
            };
        }
    }

    private processColumnConfig(config: any): Record<string, string> {
        let columns: Record<string, string> = {};

        if (Array.isArray(config)) {
            // Backwards compatibility: convert array to dictionary
            config.forEach(field => {
                columns[String(field)] = String(field);
            });
        } else if (typeof config === 'object' && config !== null) {
            // Dictionary format
            Object.entries(config).forEach(([display, field]) => {
                columns[display] = String(field);
            });
        } else if (typeof config === 'string') {
            // Single string case
            columns[config] = config;
        }

        return columns;
    }

    public async refresh() {
        const files = this.fileService.loadFiles(this.configuration);
        if (files.length === 0) {
            this.renderNoFocussFound();
            return;
        }

        const { controlsContainer, tableElement } = this.createBaseStructure();
        this.configuration.focusTracksGoHere = tableElement;

        this.controls.renderControls(controlsContainer, this.configuration);
        this.header.renderTableHeader(tableElement);

        const sortedFiles = await this.sortingService.sortFiles(files, this.configuration);

        for (const [focusTargetLabel, file] of sortedFiles) {
            const focusLogs = await this.fileService.readFocusLogs(
                file.path,
                this.configuration.logPropertyName
            );
            await this.renderFocusLogs(file.path, focusTargetLabel, focusLogs);
        }
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

    private renderNoFocussFound(): void {
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
        let rowElement = parent.querySelector(`*[data-id="${pathToId(path)}"]`) as HTMLElement;

        if (!rowElement) {
            rowElement = parent.createEl("div", {
                cls: "focus-tracker__row",
            });
            rowElement.setAttribute("data-id", pathToId(path));
        } else {
            while (rowElement.firstChild) {
                rowElement.removeChild(rowElement.firstChild);
            }
        }

        const frontmatter = await this.fileService.getFrontmatter(path);

        // Render prefix columns
        await this.renderCustomColumns(
            rowElement,
            frontmatter,
            this.configuration.prefixColumns,
            'focus-tracker__cell--prefix'
        );

        // Render focus title with markdown support
        await this.renderFocusTitle(rowElement, focusTargetLabel, path);

        // Render infix columns
        await this.renderCustomColumns(
            rowElement,
            frontmatter,
            this.configuration.infixColumns,
            'focus-tracker__cell--infix'
        );

        // Render focus entries
        await this.renderFocusEntries(rowElement, path, entries);

        // Render postfix columns
        await this.renderCustomColumns(
            rowElement,
            frontmatter,
            this.configuration.postfixColumns,
            'focus-tracker__cell--postfix'
        );
    }

    private async renderFocusTitle(
        rowElement: HTMLElement,
        focusTargetLabel: string,
        path: string
    ): Promise<void> {
        const focusTitle = rowElement.createEl("div", {
            cls: "focus-tracker__cell focus-tracker__cell--focus-target-label",
        });
        const focusTitleLink = focusTitle.createEl("a", {
            cls: "internal-link focus-title-link",
        });

        const markdownRenderer = new MarkdownRenderChild(focusTitleLink);
        await MarkdownRenderer.renderMarkdown(
            focusTargetLabel,
            focusTitleLink,
            '',
            markdownRenderer
        );

        focusTitleLink.setAttribute("href", path);
        focusTitleLink.setAttribute("aria-label", path);
    }

    private async renderCustomColumns(
        row: HTMLElement,
        frontmatter: {[key: string]: any},
        columns: Record<string, string>,
        className: string
    ): Promise<void> {
        for (let [displayName, propertyName] of Object.entries(columns)) {
            const cell = row.createEl("div", {
                cls: `focus-tracker__cell focus-tracker__cell--custom ${className}`,
            });

            let value:string = "";
            if ( propertyName?.startsWith("#") ){
                const rx = RegExp(propertyName.slice(1), "g");
                let fileTags = frontmatter["tags"];
                if (fileTags) {
                    if (!Array.isArray(fileTags)) {
                        fileTags = [String(fileTags)]
                    }
                    let matchedValues:string[] = [];
                    for (let tagValue of fileTags) {
                        const matches = tagValue.matchAll(rx);
                        for (const match of matches) {
                            if (match[1]) {
                                matchedValues.push(match[1]);
                            } else {
                                matchedValues.push(match[0]);
                            }
                        }
                    }
                    value = matchedValues.join("•");
                }
            } else {
                value = frontmatter[propertyName];
            }
            let formattedValue = ensureFrontmatterValueString(value);
            let parsedLink = parseLink(formattedValue);
            if (parsedLink.filepath && !parsedLink.displayText) {
                let filepath = parsedLink.filepath;
                if (!filepath.endsWith(".md")) {
                    filepath = filepath + ".md";
                }
                const parsedLinkFrontmatter = await this.fileService.getFrontmatter(filepath);
                if (parsedLinkFrontmatter && parsedLinkFrontmatter["title"]) {
                    let title = parsedLinkFrontmatter["title"];
                    formattedValue = `[[${parsedLink.filepath}|${title}]]`;
                }
            }

            const markdownRenderer = new MarkdownRenderChild(cell);
            await MarkdownRenderer.renderMarkdown(
                formattedValue,
                cell,
                '',
                markdownRenderer
            );

            if (cell.scrollWidth > cell.clientWidth) {
                cell.setAttribute('title', formattedValue);
            }
        }
    }

    private getDisplayValues(entry: number | string | FocusLogEntry): {
        hasValue: boolean;
        ratingSymbol: string;
        preFlagSymbols: (string | [string, string])[];
        postFlagSymbols: (string | [string, string])[];
        tooltip: string;
        focusRatingValue: number;
        remarks?: string;
    } {
        let result = {
            hasValue: false,
            ratingSymbol: "",
            preFlagSymbols: [] as (string | [string, string])[],
            postFlagSymbols: [] as (string | [string, string])[],
            tooltip: "",
            focusRatingValue: 0,
            remarks: undefined as string | undefined
        };

        if (typeof entry === 'object' && entry !== null) {
            result.focusRatingValue = entry.rating;
            result.remarks = entry.remarks;
            result.preFlagSymbols = normalizeFlags(entry["pre-flags"])
            result.postFlagSymbols = normalizeFlags(entry["post-flags"])
        } else if (typeof entry === 'number') {
            result.focusRatingValue = entry;
        } else if (typeof entry === 'string') {
            if (entry === "") {
                result.hasValue = false;
            } else {
                result.hasValue = true;
                result.ratingSymbol = entry;
                result.tooltip = entry;
            }
            return result;
        }

        if (result.focusRatingValue === 0) {
            result.hasValue = false;
        } else {
            result.hasValue = true;
            result.tooltip = `Rating: ${result.focusRatingValue}`;
            if (result.focusRatingValue >= 1) {
                result.ratingSymbol = this.getSymbol(this.ratingSymbols, result.focusRatingValue - 1);
            } else {
                result.ratingSymbol = "⭕"
            }
        }

        if (result.remarks) {
            result.tooltip = result.hasValue ?
                `${result.tooltip}\n───────────\n${result.remarks}` :
                result.remarks;
        }

        return result;
    }

    private getSymbol(symbolArray: string[], symbolIndex: number): string {
        return symbolIndex >= symbolArray.length ? OUT_OF_BOUNDS : symbolArray[symbolIndex];
    }

    private async stepFocusLogEntry(el: HTMLElement, step: number = 1) {
        const focusTrackerPath = el.getAttribute("focusTrackerPath");
        const date = el.getAttribute("date");
        const currentValue = this.getFocusRatingFromElement(el);

        let newValue = 0;
        if (currentValue === 0) {
            newValue = 1;
        } else {
            newValue = (currentValue < 0 ? (0 - currentValue) : currentValue) + 1;
            const maxScaleIndex = this.ratingSymbols.length;
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

        // Flags editor
        menu.addItem((item) =>
            item
                .setTitle('Set pre-flags')
                .setIcon('flag')
                .onClick(() => {
                    // read current flags from element attributes if available
                    const activeEl = (document.querySelector(`[focusTrackerPath="${path}"][date="${dateString}"]`) as HTMLElement) || null;
                    const currentFlagsAttr = activeEl ? activeEl.getAttribute('preFlags') || '[]' : '[]';
                    const currentFlags = JSON.parse(currentFlagsAttr);
                    new FlagsModal(this.app, currentFlags, async (flags: (string | [string, string])[]) => {
                        await this.setFocusEntry(
                            path,
                            dateString,
                            undefined,
                            flags,
                            undefined,
                            undefined,
                        );
                    }).open();
                })
        );

        menu.addItem((item) =>
            item
                .setTitle('Set post-flags')
                .setIcon('flag')
                .onClick(() => {
                    const activeEl = (document.querySelector(`[focusTrackerPath="${path}"][date="${dateString}"]`) as HTMLElement) || null;
                    const currentFlagsAttr = activeEl ? activeEl.getAttribute('postFlags') || '[]' : '[]';
                    const currentFlags = JSON.parse(currentFlagsAttr);
                    new FlagsModal(this.app, currentFlags, async (flags: (string | [string, string])[]) => {
                        await this.setFocusEntry(
                            path,
                            dateString,
                            undefined,
                            undefined,
                            flags,
                            undefined,
                        );
                    }).open();
                })
        );

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
                            await this.setFocusEntry(
                                path,
                                dateString,
                                undefined,
                                undefined,
                                undefined,
                                result
                            );
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
                        await this.setFocusEntry(
                            path,
                            dateString,
                            symbolIndex,
                            undefined,
                            undefined,
                        );
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
                    await this.setFocusEntry(
                        path,
                        dateString,
                        0,
                        undefined,
                    );
                })
        );

        menu.showAtMouseEvent(event);
    }

    private async setFocusEntry(
        focusTrackerPath: string | null,
        date: string | null,
        newRating?: number,
        newPlanningFlags?: (string | [string, string])[],
        newResultFlags?: (string | [string, string])[],
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
                newEntry = { rating: currentEntry, "pre-flags": [] as string[], "post-flags": []};
            } else {
                newEntry = { rating: 0, "pre-flags": [] as string[], "post-flags": []};
            }

            if (newRating !== undefined) {
                newEntry.rating = newRating;
            }
            if (newPlanningFlags !== undefined) {
                newEntry["pre-flags"] = newPlanningFlags;
            }
            if (newResultFlags !== undefined) {
                newEntry["post-flags"] = newResultFlags;
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
            await this.fileService.getFocusTargetLabel(
                focusTrackerPath,
                this.configuration.titlePropertyNames
            ),
            await this.fileService.readFocusLogs(
                focusTrackerPath,
                this.configuration.logPropertyName
            )
        );
    }

    private async renderFocusEntries(
        rowElement: HTMLElement,
        path: string,
        entries: FocusLogsType
    ): Promise<void> {
        const totalDays = this.configuration.daysInPast + this.configuration.daysInFuture + 1;
        let currentDate = new Date(this.configuration.focalDate);
        currentDate.setDate(currentDate.getDate() - this.configuration.daysInPast);
        currentDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < totalDays; i++) {
            const dateString = this.getDateId(currentDate);
            const entry = entries[dateString];
            const {
                hasValue,
                ratingSymbol,
                preFlagSymbols,
                postFlagSymbols,
                tooltip,
                focusRatingValue,
                remarks
            } = this.getDisplayValues(entry);

            const focusCell = rowElement.createEl("div", {
                cls: `focus-tracker__cell focus-tick focus-tick-entry focus-tick--${hasValue} focus-tracker__cell--${this.getDayOfWeek(currentDate)}`,
                title: tooltip,
            });

            this.setupFocusCell(focusCell, {
                hasValue,
                dateString,
                path,
                focusRatingValue,
                remarks,
                ratingSymbol,
                preFlagSymbols,
                postFlagSymbols,
                currentDate,
                today
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    private setupFocusCell(
        focusCell: HTMLElement,
        config: {
            hasValue: boolean;
            dateString: string;
            path: string;
            focusRatingValue: number;
            remarks?: string;
            ratingSymbol: string;
            preFlagSymbols: (string | [string, string])[];
            postFlagSymbols: (string | [string, string])[];
            currentDate: Date;
            today: Date;
        }
    ): void {
        focusCell.setAttribute("ticked", config.hasValue.toString());
        focusCell.setAttribute("date", config.dateString);
        focusCell.setAttribute("focusTrackerPath", config.path);
        focusCell.setAttribute("focusRating", config.focusRatingValue?.toString() || "");

        if (config.remarks) {
            focusCell.setAttribute("focusRemarks", config.remarks);
        }
        if (config.preFlagSymbols && config.preFlagSymbols.length > 0) {
            // Store as JSON string to preserve tuple structure
            focusCell.setAttribute('preFlags', JSON.stringify(config.preFlagSymbols));
        } else {
            focusCell.setAttribute('preFlags', '[]');
        }
        if (config.postFlagSymbols && config.postFlagSymbols.length > 0) {
            // Store as JSON string to preserve tuple structure
            focusCell.setAttribute('postFlags', JSON.stringify(config.postFlagSymbols));
        } else {
            focusCell.setAttribute('postFlags', '[]');
        }

        const cellContainer = focusCell.createEl('div', {
            cls: 'focus-cell-container',
        });
        const preFlagsColumn = cellContainer.createEl('div', {
            cls: 'focus-cell-flags',
        });
        const ratingSymbolColumn = cellContainer.createEl('div', {
            cls: 'focus-cell-rating',
            text: config.ratingSymbol || "⚪",
        });
        const postFlagsColumn = cellContainer.createEl('div', {
            cls: 'focus-cell-flags',
        });


        if (config.preFlagSymbols && config.preFlagSymbols.length > 0) {
            cellContainer.addClass("focus-tracker__cell-container--has-flags")
            preFlagsColumn.addClass("focus-tracker__flags-cell--has-flags")
            // Add each preFlag as a separate div
            config.preFlagSymbols.forEach(preFlag => {
                const flagEl = preFlagsColumn.createEl('div', {
                    cls: 'focus-cell-flags',
                    text: Array.isArray(preFlag) ? preFlag[0] : preFlag
                });
                if (Array.isArray(preFlag)) {
                    flagEl.setAttribute('title', `${preFlag[0]}  ${preFlag[1]}`);
                }
            });
        } else {
            cellContainer.addClass("focus-tracker__cell-container--no-flags")
            preFlagsColumn.addClass("focus-tracker__flags-cell--no-flags")
        }

        if (config.postFlagSymbols && config.postFlagSymbols.length > 0) {
            cellContainer.addClass("focus-tracker__cell-container--has-flags")
            postFlagsColumn.addClass("focus-tracker__flags-cell--has-flags")
            // Add each postFlag as a separate div
            config.postFlagSymbols.forEach(postFlag => {
                const flagEl = postFlagsColumn.createEl('div', {
                    cls: 'focus-cell-flags',
                    text: Array.isArray(postFlag) ? postFlag[0] : postFlag
                });
                if (Array.isArray(postFlag)) {
                    flagEl.setAttribute('title', `${postFlag[0]}  ${postFlag[1]}`);
                }
            });
        } else {
            cellContainer.addClass("focus-tracker__cell-container--no-flags")
            postFlagsColumn.addClass("focus-tracker__flags-cell--no-flags")
        }


        focusCell.addEventListener("click", (e: MouseEvent) => {
            if (e.altKey) {
                this.stepFocusLogEntry(focusCell, -1);
            } else {
                this.stepFocusLogEntry(focusCell, 1);
            }
        });

        focusCell.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            this.showFocusMenu(event, config.path, config.dateString, config.remarks);
        });

        if (isSameDate(config.currentDate, this.configuration.focalDate)) {
            focusCell.addClass("focus-tracker__cell--focal-date");
        }

        if (isSameDate(config.currentDate, config.today)) {
            focusCell.addClass("focus-tracker__cell--today");
        } else if (config.currentDate > config.today) {
            focusCell.addClass("focus-tracker__cell--future");
        } else if (config.currentDate < config.today) {
            focusCell.addClass("focus-tracker__cell--past");
        }
    }

    private getDayOfWeek(date: Date): string {
        const daysOfWeek = [
            "sunday", "monday", "tuesday", "wednesday",
            "thursday", "friday", "saturday"
        ];
        return daysOfWeek[date.getDay()].toLowerCase();
    }

    public getDateId(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

}
