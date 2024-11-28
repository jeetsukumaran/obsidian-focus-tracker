import { App, Notice, TFile, MarkdownRenderer, MarkdownRenderChild, Menu } from "obsidian";
import { FileService } from './services/FileService';
import { SortingService } from './services/SortingService';
import { FocusTrackerControls } from './components/FocusTrackerControls';
import { FocusTrackerHeader } from './components/FocusTrackerHeader';
import { FocusTrackerConfiguration, FocusTrackerSettings, FocusLogsType, FocusLogEntry } from './types';
import { DEFAULT_CONFIGURATION } from './config/defaults';
import { RemarksModal } from './components/RemarksModal';
import { isSameDate } from './utils/dates';
import { generateUniqueId, normalizeKeys, pathToId } from './utils/strings';
import { formatFrontmatterValue } from './utils/formatting';
import { parseYaml } from 'obsidian';
import { PLUGIN_NAME, DEFAULT_MAPS, DEFAULT_CONFIG, OUT_OF_BOUNDS } from './constants';

export default class FocusTracker {
    private fileService: FileService;
    private sortingService: SortingService;
    private controls: FocusTrackerControls;
    private header: FocusTrackerHeader;
    public configuration: FocusTrackerConfiguration;
    public id: string;
    public rootElement: HTMLElement;
    private _ratingSymbols: string[];
    private _flagSymbols: string[];

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
            let postfixColumns = this.processColumnConfig(parsedConfig['postfix-columns']);

            const ratingMapKey = parsedConfig['rating-map'] || this.settings.defaultRatingMap;
            const flagMapKey = parsedConfig['flag-map'] || this.settings.defaultFlagMap;

            const ratingMap = DEFAULT_MAPS.ratings[ratingMapKey] ||
                            DEFAULT_MAPS.ratings[this.settings.defaultRatingMap];
            const flagMap = DEFAULT_MAPS.flags[flagMapKey] ||
                            DEFAULT_MAPS.flags[this.settings.defaultFlagMap];

            return {
                ...DEFAULT_CONFIGURATION(),
                ...normalizedConfig,
                prefixColumns,
                postfixColumns,
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

    public get flagSymbols(): string[] {
        if (!this._flagSymbols) {
            this._flagSymbols = [...this.configuration.flagSymbols];
        }
        return this._flagSymbols;
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
            const formattedValue = formatFrontmatterValue(value);

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
        symbol: string;
        tooltip: string;
        entryScalarValue: number;
        remarks?: string;
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
                result.symbol = this.getSymbol(this.ratingSymbols, result.entryScalarValue - 1);
                result.tooltip = `Rating: ${result.entryScalarValue}`;
            } else {
                let arrayIndex = (-1 * result.entryScalarValue) - 1;
                result.symbol = this.getSymbol(this.flagSymbols, arrayIndex);
                let flagKey = this.configuration.flagKeys?.[arrayIndex];
                let flagDesc = flagKey ? `: ${flagKey}` : "";
                result.tooltip = `Flag ${-1 * result.entryScalarValue}${flagDesc}`;
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

        menu.showAtMouseEvent(event);
    }

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
                symbol,
                tooltip,
                entryScalarValue,
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
                entryScalarValue,
                remarks,
                symbol,
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
            entryScalarValue: number;
            remarks?: string;
            symbol: string;
            currentDate: Date;
            today: Date;
        }
    ): void {
        focusCell.setAttribute("ticked", config.hasValue.toString());
        focusCell.setAttribute("date", config.dateString);
        focusCell.setAttribute("focusTrackerPath", config.path);
        focusCell.setAttribute("focusRating", config.entryScalarValue?.toString() || "");

        if (config.remarks) {
            focusCell.setAttribute("focusRemarks", config.remarks);
        }

        focusCell.setText(config.symbol);

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
