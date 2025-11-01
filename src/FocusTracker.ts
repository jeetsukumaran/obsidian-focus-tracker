import { App, MarkdownRenderer, MarkdownRenderChild, Menu } from 'obsidian';
import { FileService } from './services/FileService';
import { SortingService } from './services/SortingService';
import { FocusTrackerControls } from './components/FocusTrackerControls';
import { FocusTrackerHeader } from './components/FocusTrackerHeader';
import { 
    FocusTrackerConfiguration, 
    FocusTrackerSettings, 
    FocusLogsType,
    FlagEntry,
    FocusLogEntry 
} from './types';
import { OUT_OF_BOUNDS } from './constants';
import { pathToId, generateUniqueId } from './utils/strings';

function normalizeFlags(flags: any): FlagEntry[] {
    // Handle null or undefined flags. The `== null` check covers both.
    if (flags == null) {
        return [];
    }

    // Handle arrays
    if (Array.isArray(flags)) {
        return flags.map(item => {
            // If item is already a tuple (array with two elements)
            if (Array.isArray(item) && item.length === 2) {
                return [String(item[0]), String(item[1])] as [string, string];
            }
            // Legacy format or single string
            return String(item);
        });
    }

    // Handle objects
    if (typeof flags === 'object') {
        return Object.entries(flags).map(([key, value]) => [String(key), String(value)] as [string, string]);
    }

    // Handle all other scalar values (number, string, boolean, etc.)
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

    private getFlagDisplayInfo(flag: FlagEntry): { symbol: string, tooltip: string } {
        if (Array.isArray(flag)) {
            const [symbol, label] = flag;
            return { symbol, tooltip: `${symbol}  ${label}` };
        }
        return { symbol: flag, tooltip: flag };
    }

    private getDisplayValues(entry: number | string | FocusLogEntry): {
        hasValue: boolean;
        ratingSymbol: string;
        preFlagSymbols: { symbol: string, tooltip: string }[];
        postFlagSymbols: { symbol: string, tooltip: string }[];
        tooltip: string;
        focusRatingValue: number;
        remarks?: string;
    } {
        let result = {
            hasValue: false,
            ratingSymbol: "",
            preFlagSymbols: [] as { symbol: string, tooltip: string }[],
            postFlagSymbols: [] as { symbol: string, tooltip: string }[],
            tooltip: "",
            focusRatingValue: 0,
            remarks: undefined as string | undefined
        };

        if (typeof entry === 'object' && entry !== null) {
            result.focusRatingValue = entry.rating || 0;
            if (entry["pre-flags"]) {
                result.preFlagSymbols = normalizeFlags(entry["pre-flags"]).map(f => this.getFlagDisplayInfo(f));
            }
            if (entry["post-flags"]) {
                result.postFlagSymbols = normalizeFlags(entry["post-flags"]).map(f => this.getFlagDisplayInfo(f));
            }
            result.remarks = entry.remarks;
            result.hasValue = true;
        } else if (typeof entry === 'number') {
            result.focusRatingValue = entry;
            result.hasValue = true;
        } else if (typeof entry === 'string') {
            const numValue = Number(entry);
            if (!isNaN(numValue)) {
                result.focusRatingValue = numValue;
                result.hasValue = true;
            }
        }

        if (result.focusRatingValue === 0) {
            result.ratingSymbol = "";
        } else {
            const symbolIndex = result.focusRatingValue - 1;
            result.ratingSymbol = this.getSymbol(this._ratingSymbols, symbolIndex);
            result.tooltip = `Rating: ${result.ratingSymbol} (${result.focusRatingValue})`;
        }

        if (result.remarks) {
            result.tooltip = result.tooltip
                ? `${result.tooltip}\n\nRemarks: ${result.remarks}`
                : `Remarks: ${result.remarks}`;
        }

        return result;
    }

    private async setFocusEntry(
        focusTrackerPath: string | null,
        date: string | null,
        newRating?: number,
        newPlanningFlags?: FlagEntry[],
        newResultFlags?: FlagEntry[],
        remarks?: string
    ): Promise<void> {
        if (!focusTrackerPath || !date) return;

        let entry: FocusLogEntry = {
            rating: newRating || 0,
        };

        if (newPlanningFlags) {
            entry["pre-flags"] = newPlanningFlags;
        }

        if (newResultFlags) {
            entry["post-flags"] = newResultFlags;
        }

        if (remarks) {
            entry.remarks = remarks;
        }

        await this.fileService.setFocusEntry(focusTrackerPath, date, entry);
        this.refresh();
    }

    private getSymbol(symbolArray: string[], symbolIndex: number): string {
        return symbolIndex >= symbolArray.length ? OUT_OF_BOUNDS : symbolArray[symbolIndex];
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
            preFlagSymbols: { symbol: string, tooltip: string }[];
            postFlagSymbols: { symbol: string, tooltip: string }[];
            currentDate: Date;
            today: Date;
        }
    ): void {
        focusCell.empty();
        focusCell.addClasses(['focus-tracker__cell', 'focus-tracker__cell--focus']);
        if (config.hasValue) {
            focusCell.addClass('focus-tracker__cell--has-focus');
        }
        if (config.dateString === this.dateToString(config.today)) {
            focusCell.addClass('focus-tracker__cell--today');
        }

        focusCell.setAttribute('date', config.dateString);
        focusCell.setAttribute('focusTrackerPath', config.path);
        focusCell.setAttribute('focusRating', config.focusRatingValue.toString());
        focusCell.setAttribute('id', `${this.id}-${config.dateString}`);

        const container = focusCell.createDiv({ cls: 'focus-entry' });

        if (config.preFlagSymbols.length > 0) {
            const preFlagsContainer = container.createDiv({ cls: 'focus-entry__pre-flags' });
            config.preFlagSymbols.forEach(flag => {
                const flagElement = preFlagsContainer.createSpan({ text: flag.symbol });
                flagElement.setAttribute('title', flag.tooltip);
            });
        }

        const ratingElement = container.createDiv({
            cls: 'focus-entry__rating',
            text: config.ratingSymbol,
        });

        if (config.remarks) {
            ratingElement.setAttribute('title', config.remarks);
        }

        if (config.postFlagSymbols.length > 0) {
            const postFlagsContainer = container.createDiv({ cls: 'focus-entry__post-flags' });
            config.postFlagSymbols.forEach(flag => {
                const flagElement = postFlagsContainer.createSpan({ text: flag.symbol });
                flagElement.setAttribute('title', flag.tooltip);
            });
        }

        const dayOfWeek = config.currentDate.toLocaleDateString('en-US', { weekday: 'short' });
        container.setAttribute('dayOfWeek', dayOfWeek);
    }

    private dateToString(date: Date): string {
        return date.toISOString().slice(0, 10);
    }

    // Required method stubs

    private loadConfiguration(src: string): FocusTrackerConfiguration {
        // Implementation would go here
        throw new Error("Method not implemented.");
    }

    public async refresh(): Promise<void> {
        // Implementation would go here
        throw new Error("Method not implemented.");
    }
}