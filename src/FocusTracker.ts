import {
    App,
    parseYaml,
    Notice,
    TAbstractFile,
    TFile
} from "obsidian"

const PLUGIN_NAME = "Focus Tracker"
const DAYS_TO_SHOW = 21
const DAYS_TO_LOAD = DAYS_TO_SHOW + 1
const SCALE1 = [
    "",
    "🔴",
    "🟠",
    "🟡",
    "🟢",
    "🔵",
    "🟣",
    // "🟤",
    // "⚪",
    // "⚫",
];

const SCALE2 = [
    "",
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

export type FocusLogsType = {
	[date: string]: number;
}

interface FocusTrackerSettings {
	path: string;
	lastDisplayedDate: string;
	daysToShow: number;
	logPropertyName: string;
	scoringScale: string[];
	daysToLoad: number;
	rootElement: HTMLDivElement | undefined;
	focusTracksGoHere: HTMLDivElement | undefined;
}

const DEFAULT_SETTINGS = (): FocusTrackerSettings => ({
	path: "",
	lastDisplayedDate: getTodayDate(),
	daysToShow: DAYS_TO_SHOW,
	logPropertyName: "focus-logs",
	scoringScale: SCALE1,
	daysToLoad: DAYS_TO_LOAD,
	rootElement: undefined,
	focusTracksGoHere: undefined,
})

const ALLOWED_USER_SETTINGS = ["path", "lastDisplayedDate", "daysToShow"]

function getTodayDate() {
	const today = new Date()
	const year = today.getFullYear()
	const month = String(today.getMonth() + 1).padStart(2, "0")
	const day = String(today.getDate()).padStart(2, "0")

	return `${year}-${month}-${day}`
}

function getDaysDifference(startDateId, endDateId) {
	const start = new Date(startDateId)
	const end = new Date(endDateId)
	const oneDay = 24 * 60 * 60 * 1000 // hours * minutes * seconds * milliseconds

	const diffInTime = Math.abs(end.getTime() - start.getTime())
	const diffInDays = Math.round(diffInTime / oneDay)

	return diffInDays
}

export default class FocusTracker {
	settings: FocusTrackerSettings
	app: App
	id: String

	constructor(src, el, ctx, app) {
		this.app = app
		this.id = this.generateUniqueId()
		this.settings = this.loadSettings(src)
		this.settings.rootElement = el

		// 1. get all the focus tracks
		const files = this.loadFiles()

		if (files.length === 0) {
			this.renderNoFocussFoundMessage()
			return
		}

		// 2.1 render the element that holds all focus tracks
		this.settings.focusTracksGoHere = this.renderRoot(el)

		// 2.2 render the header
		this.renderHeader(this.settings.focusTracksGoHere)

		// 2.3 render each focus
		files.forEach(async (f) => {
			this.renderFocusLogs(
                f.path,
                await this.readFocusLogs(f.path),
			)
		})
	}

	loadFiles() {
		return this.app.vault
			.getMarkdownFiles()
			.filter((file) => {
				// only focus tracks
				if (!file.path.includes(this.settings.path)) {
					return false
				}

				return true
			})
			.sort((a, b) => a.name.localeCompare(b.name))
	}

	loadSettings(rawSettings) {
		try {
			let settings = Object.assign(
				{},
				DEFAULT_SETTINGS(),
				this.removePrivateSettings(JSON.parse(rawSettings)),
			)
			settings.daysToLoad = settings.daysToShow + 1
			return settings
		} catch (error) {
			new Notice(
				`${PLUGIN_NAME}: received invalid settings. continuing with default settings`,
			)
			return DEFAULT_SETTINGS()
		}
	}

	removePrivateSettings(userSettings) {
		const result = {}
		ALLOWED_USER_SETTINGS.forEach((key) => {
			if (userSettings[key]) {
				result[key] = userSettings[key]
			}
		})

		return result
	}

	renderNoFocussFoundMessage() {
		this.settings.rootElement?.createEl("div", {
			text: `No focus tracks found under ${this.settings.path}`,
		})
	}

	renderRoot(parent) {
		const rootElement = parent.createEl("div", {
			cls: "focus-tracker",
		})
		rootElement.setAttribute("id", this.id)
		rootElement.addEventListener("click", (e) => {
			const target = e.target as HTMLDivElement
			if (target?.classList.contains("focus-tick")) {
				this.cycleFocusLogEntry(target)
			}
		})

		return rootElement
	}

	renderHeader(parent) {
		const header = parent.createEl("div", {
			cls: "focus-tracker__header focus-tracker__row",
		})

		header.createEl("div", {
			text: "",
			cls: "focus-tracker__cell--name focus-tracker__cell",
		})

		const currentDate = this.createDateFromFormat(
			this.settings.lastDisplayedDate,
		)
		currentDate.setDate(currentDate.getDate() - this.settings.daysToLoad + 1)
		for (let i = 0; i < this.settings.daysToLoad; i++) {
			const day = currentDate.getDate().toString()
			header.createEl("div", {
				cls: `focus-tracker__cell focus-tracker__cell--${this.getDayOfWeek(
					currentDate,
				)}`,
				text: day,
			})
			currentDate.setDate(currentDate.getDate() + 1)
		}
	}

	async getFrontmatter(path: string) {
		const file: TAbstractFile|null = this.app.vault.getAbstractFileByPath(path)

		if (!file || !(file instanceof TFile) ) {
			new Notice(`${PLUGIN_NAME}: No file found for path: ${path}`)
			return {}
		}

		try {
			return await this.app.vault.read(file).then((result) => {
				const frontmatter = result.split("---")[1]
				if (!frontmatter) {
				    return {}
				}
				return parseYaml(frontmatter)
			})
		} catch (error) {
			return {}
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

	renderFocusLogs(
        path: string,
        entries: FocusLogsType,
	) {
		if (!this.settings.focusTracksGoHere) {
			new Notice(`${PLUGIN_NAME}: missing div that holds all focus tracks`)
			return null
		}
		const parent = this.settings.focusTracksGoHere

		const name = path.split("/").pop()?.replace(".md", "")

		// no. this needs to be queried inside this.settings.rootElement;
		let row = parent.querySelector(`*[data-id="${this.pathToId(path)}"]`)

		if (!row) {
			row = this.settings.focusTracksGoHere.createEl("div", {
				cls: "focus-tracker__row",
			})
			row.setAttribute("data-id", this.pathToId(path))
		} else {
			this.removeAllChildNodes(row)
		}

		const focusTitle = row.createEl("div", {
			cls: "focus-tracker__cell--name focus-tracker__cell",
		})

		const focusTitleLink = focusTitle.createEl("a", {
			text: name,
			cls: "internal-link",
		})

		focusTitleLink.setAttribute("href", path)
		focusTitleLink.setAttribute("aria-label", path)

		const currentDate = this.createDateFromFormat(
			this.settings.lastDisplayedDate,
		)
		currentDate.setDate(currentDate.getDate() - this.settings.daysToLoad + 1) // todo, why +1?

		// const entriesSet = new Set(entries)

		for (let i = 0; i < this.settings.daysToLoad; i++) {
			const dateString: string = this.getDateId(currentDate);
			const entryValue: number = entries[dateString] || 0;
			const displayValue: string = this.getDisplayValue(entryValue, this.settings.scoringScale);
			let isTicked: boolean = entryValue !== 0;

			const focusCell = row.createEl("div", {
				cls: `focus-tracker__cell
				focus-tick
				focus-tick--${isTicked}--disabled
				focus-tracker__cell--${this.getDayOfWeek(currentDate)}`,
			})

			focusCell.setAttribute("ticked", isTicked.toString())

			focusCell.setAttribute("date", dateString);
			focusCell.setAttribute("focus", path);
			focusCell.setAttribute("focusScore", entryValue.toString());
			focusCell.setAttribute("bg-color", this.getColorForValue(
                entryValue,
                this.settings.scoringScale.length,
                "cyan",
                false,
			));
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


    getFocusScoreFromElement(el: HTMLElement): number {
        const attrValue = el.getAttribute("focusScore");
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

    getDisplayValue(input: string | number, scale: string[]): string {
        if (typeof input === 'string') {
            if (input === "") {
                return "";
            }
            const index = scale.indexOf(input);
            // unrecognized but non-blank string is treated as a score
            return index !== -1 ? scale[index] : scale.at(-1) || scale[1] || "X";
        } else if (typeof input === 'number') {
            return input >= 0 && input < scale.length ? scale[input] : scale.at(-1) || scale[1] || "*";
        }
        return scale[0]; // Default return for unexpected input types
    }

	async cycleFocusLogEntry(el) {
		const focus = el.getAttribute("focus")
		const date = el.getAttribute("date")
		const file: TAbstractFile|null = this.app.vault.getAbstractFileByPath(focus)

		if (!file ||!(file instanceof TFile)) {
			new Notice(`${PLUGIN_NAME}: file missing while trying to cycle focus entry`)
			return
		}

		this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			let entries = frontmatter[this.settings.logPropertyName] || {};
            const currentValue: number = this.getFocusScoreFromElement(el);
            const maxScaleIndex:number = this.settings.scoringScale.length;
            let newValue = currentValue + 1;
            if (newValue >= maxScaleIndex) {
                newValue = 0;
            }
            entries[date] = newValue;
			frontmatter[this.settings.logPropertyName] = entries
		})

		this.renderFocusLogs(file.path, await this.readFocusLogs(file.path))
	}

	writeFile(file: TAbstractFile, content: string) {
		if (!content) {
			new Notice(
				`${PLUGIN_NAME}: could not save changes due to missing content`,
			)
			return null
		}

		if (!file ||!(file instanceof TFile)) {
			new Notice(
				`${PLUGIN_NAME}: could not save changes due to missing file`,
			)
			return null
		}

		try {
			return this.app.vault.modify(file, content)
		} catch (error) {
			new Notice(`${PLUGIN_NAME}: could not save changes`)
			return Promise.reject(error)
		}
	}

	removeAllChildNodes(parent) {
		while (parent.firstChild) {
			parent.removeChild(parent.firstChild)
		}
	}

	pathToId(path) {
		return path
			.replaceAll("/", "_")
			.replaceAll(".", "__")
			.replaceAll(" ", "___")
	}

	createDateFromFormat(dateString) {
		const [year, month, day] = dateString.split("-").map(Number)
		const date = new Date()

		date.setFullYear(year)
		date.setMonth(month - 1)
		date.setDate(day)

		return date
	}

	getDateId(date) {
		const year = date.getFullYear()
		const month = String(date.getMonth() + 1).padStart(2, "0")
		const day = String(date.getDate()).padStart(2, "0")

		let dateId = `${year}-${month}-${day}`

		return dateId
	}

	getDayOfWeek(date) {
		const daysOfWeek = [
			"sunday",
			"monday",
			"tuesday",
			"wednesday",
			"thursday",
			"friday",
			"saturday",
		]
		const dayIndex = date.getDay()
		const dayName = daysOfWeek[dayIndex]
		return dayName.toLowerCase()
	}

	generateUniqueId() {
		const timestamp = Date.now()
		const randomNum = Math.floor(Math.random() * 10000) // Adjust the range as needed
		return `focustracker-${timestamp}-${randomNum}`
	}
}
