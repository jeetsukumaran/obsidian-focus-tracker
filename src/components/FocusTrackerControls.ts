import { App } from "obsidian";
import { FocusTrackerConfiguration } from '../types';
import { getLocalDateString } from '../utils/dates';

export class FocusTrackerControls {
    constructor(
        private app: App,
        private onConfigChange: () => void
    ) {}

    createControlSection(
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

    renderControls(parent: HTMLElement, config: FocusTrackerConfiguration): void {
        this.createControlSection(
            parent,
            "Days Past:",
            config.daysInPast,
            MIN_DAYS_PAST,
            DEFAULT_CONFIG.daysPast,
            (value) => {
                config.daysInPast = value;
                this.onConfigChange();
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
            value: getLocalDateString(config.focalDate),
            cls: "focus-tracker__focal-date",
        });

        const dateControls = focalDateSection.createEl("div", {
            cls: "focus-tracker__date-controls",
        });

        this.createDateControls(dateControls, focalDateInput, config);

        this.createControlSection(
            parent,
            "Days Future:",
            config.daysInFuture,
            MIN_DAYS_FUTURE,
            DEFAULT_CONFIG.daysFuture,
            (value) => {
                config.daysInFuture = value;
                this.onConfigChange();
            }
        );
    }

    private createDateControls(
        container: HTMLElement,
        dateInput: HTMLInputElement,
        config: FocusTrackerConfiguration
    ): void {
        const decrementDateBtn = container.createEl("button", {
            text: "◀",
            cls: "focus-tracker__btn-date",
        });

        const todayBtn = container.createEl("button", {
            text: "●",
            cls: "focus-tracker__btn-today",
        });

        const incrementDateBtn = container.createEl("button", {
            text: "▶",
            cls: "focus-tracker__btn-date",
        });

        decrementDateBtn.onclick = () => {
            config.focalDate.setDate(config.focalDate.getDate() - 1);
            dateInput.value = config.focalDate.toISOString().split("T")[0];
            this.onConfigChange();
        };

        incrementDateBtn.onclick = () => {
            config.focalDate.setDate(config.focalDate.getDate() + 1);
            dateInput.value = config.focalDate.toISOString().split("T")[0];
            this.onConfigChange();
        };

        todayBtn.onclick = () => {
            config.focalDate = new Date();
            dateInput.value = config.focalDate.toISOString().split("T")[0];
            this.onConfigChange();
        };

        dateInput.onchange = () => {
            const [year, month, day] = dateInput.value.split('-').map(Number);
            config.focalDate = new Date(year, month - 1, day);
            this.onConfigChange();
        };
    }
}
