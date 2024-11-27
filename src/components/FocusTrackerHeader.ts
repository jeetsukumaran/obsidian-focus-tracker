import { FocusTrackerConfiguration } from '../types';
import { isSameDate, getDayOfWeek } from '../utils/dates';

export class FocusTrackerHeader {
    constructor(
        private config: FocusTrackerConfiguration,
        private onSortingChange: () => void
    ) {}

    renderTableHeader(parent: HTMLElement): void {
        const header = parent.createEl("div", {
            cls: "focus-tracker__header focus-tracker__row",
        });

        // Render prefix column headers
        Object.entries(this.config.prefixColumns).forEach(([displayName, propertyName]) => {
            const headerCell = header.createEl("div", {
                cls: "focus-tracker__cell focus-tracker__cell--custom focus-tracker__cell--prefix",
                text: displayName
            });
            this.addSortingToHeader(headerCell, propertyName);
            this.addResizeHandle(headerCell);
        });

        // Render main label column
        const trackHeader = header.createEl("div", {
            cls: "focus-tracker__cell focus-tracker__cell--focus-target-label",
            text: "Track"
        });
        this.addSortingToHeader(trackHeader, 'track');
        this.addResizeHandle(trackHeader);

        // Render date cells
        this.renderDateCells(header);

        // Render postfix column headers
        Object.entries(this.config.postfixColumns).forEach(([displayName, propertyName]) => {
            const headerCell = header.createEl("div", {
                cls: "focus-tracker__cell focus-tracker__cell--custom focus-tracker__cell--postfix",
                text: displayName
            });
            this.addSortingToHeader(headerCell, propertyName);
            this.addResizeHandle(headerCell);
        });
    }

    private renderDateCells(header: HTMLElement): void {
        const totalDays = this.config.daysInPast + this.config.daysInFuture + 1;
        let currentDate = new Date(this.config.focalDate);
        currentDate.setHours(0, 0, 0, 0);
        currentDate.setDate(currentDate.getDate() - this.config.daysInPast);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const focalDate = new Date(this.config.focalDate);
        focalDate.setHours(0, 0, 0, 0);

        for (let i = 0; i < totalDays; i++) {
            const day = currentDate.getDate().toString();
            const cellEl = header.createEl("div", {
                cls: `focus-tracker__cell focus-tracker__cell--${getDayOfWeek(currentDate)}`,
                text: day,
            });

            if (isSameDate(currentDate, today)) {
                cellEl.addClass("focus-tracker__cell--today");
            }
            if (isSameDate(currentDate, focalDate)) {
                cellEl.addClass("focus-tracker__cell--focal-date");
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    private addResizeHandle(cell: HTMLElement): void {
        const handle = cell.createEl('div', {
            cls: 'focus-tracker__resize-handle',
        });

        let startX: number;
        let startWidth: number;

        const startResize = (e: MouseEvent) => {
            startX = e.pageX;
            startWidth = cell.offsetWidth;
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        };

        const resize = (e: MouseEvent) => {
            const width = startWidth + (e.pageX - startX);
            cell.style.width = `${width}px`;
            cell.style.minWidth = `${width}px`;
        };

        const stopResize = () => {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
            document.body.style.cursor = '';
        };

        handle.addEventListener('mousedown', startResize);
    }

    private addSortingToHeader(headerCell: HTMLElement, columnName: string): void {
        headerCell.addClass('focus-tracker__cell--sortable');

        if (this.config.sortColumn === columnName) {
            headerCell.addClass('focus-tracker__cell--sorted');
            headerCell.addClass(
                this.config.sortDescending
                    ? 'focus-tracker__cell--sort-desc'
                    : 'focus-tracker__cell--sort-asc'
            );
        }

        headerCell.addEventListener('click', () => {
            if (this.config.sortColumn === columnName) {
                this.config.sortDescending = !this.config.sortDescending;
            } else {
                this.config.sortColumn = columnName;
                this.config.sortDescending = false;
            }
            this.onSortingChange();
        });
    }
}

