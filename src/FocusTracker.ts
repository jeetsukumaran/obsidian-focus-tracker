// Working with files and folders in your plugin: https://www.youtube.com/watch?v=_QFUOyIB1nY
// Display data in views and status bar: https://www.youtube.com/watch?v=zR86pftlOsg&ab_channel=Obsidian
// Easy and fast UI development with Svelte: https://www.youtube.com/watch?v=mCF80HBfUWA&ab_channel=Obsidian
// https://github.com/OliverBalfour/obsidian-pandoc/blob/master/renderer.ts
// example of replacing codeblocks https://github.com/joleaf/obsidian-email-block-plugin
// https://ourgreenstory.com/nl/sticky-whiteboard/focus-tracker/
// listen to file change https://github.com/obsidianmd/obsidian-api/blob/c01fc3074deeb3dfc6ee02546d113b448735b294/obsidian.d.ts#L3724

import {App, parseYaml, Notice, TAbstractFile, TFile} from 'obsidian'

const PLUGIN_NAME = 'Focus Tracker 21'
/* i want to show that a streak is already ongoing even if the previous dates are not rendered
  so I load an extra date in the range, but never display it in the UI */
const DAYS_TO_SHOW = 21
const DAYS_TO_LOAD = DAYS_TO_SHOW + 1

interface FocusTrackerSettings {
	path: string
	lastDisplayedDate: string
	daysToShow: number
	daysToLoad: number
	rootElement: HTMLDivElement | undefined
	focussGoHere: HTMLDivElement | undefined
}

const DEFAULT_SETTINGS = (): FocusTrackerSettings => ({
	path: '',
	lastDisplayedDate: getTodayDate(),
	daysToShow: DAYS_TO_SHOW,
	daysToLoad: DAYS_TO_LOAD,
	rootElement: undefined,
	focussGoHere: undefined,
})

const ALLOWED_USER_SETTINGS = ['path', 'lastDisplayedDate', 'daysToShow']

function getTodayDate() {
	const today = new Date()
	const year = today.getFullYear()
	const month = String(today.getMonth() + 1).padStart(2, '0')
	const day = String(today.getDate()).padStart(2, '0')

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
		// console.log(`${PLUGIN_NAME} got with these settings:`, this.settings)

		// 1. get all the focuss
		const files = this.loadFiles()

		if (files.length === 0) {
			this.renderNoFocussFoundMessage()
			return
		}

		console.log(
			`${PLUGIN_NAME} loaded successfully ${files.length} file(s) from ${this.settings.path}`,
		)

		// 2.1 render the element that holds all focuss
		this.settings.focussGoHere = this.renderRoot(el)

		// 2.2 render the header
		this.renderHeader(this.settings.focussGoHere)

		// 2.3 render each focus
		files.forEach(async (f) => {
			this.renderFocus(f.path, await this.getFocusEntries(f.path))
		})
	}

	loadFiles() {
		return this.app.vault
			.getMarkdownFiles()
			.filter((file) => {
				// only focuss
				if (!file.path.includes(this.settings.path)) {
					// console.log(`${file.path} doesn't match ${this.settings.path}`);
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
			/* i want to show that a streak is already ongoing even if the previous dates are not rendered
  		so I load an extra date in the range, but never display it in the UI */
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
		this.settings.rootElement?.createEl('div', {
			text: `No focuss found under ${this.settings.path}`,
		})
	}

	renderRoot(parent) {
		const rootElement = parent.createEl('div', {
			cls: 'focus-tracker',
		})
		rootElement.setAttribute('id', this.id)
		rootElement.addEventListener('click', (e) => {
			const target = e.target as HTMLDivElement
			if (target?.classList.contains('focus-tick')) {
				this.toggleFocus(target)
			}
		})

		return rootElement
	}

	renderHeader(parent) {
		const header = parent.createEl('div', {
			cls: 'focus-tracker__header focus-tracker__row',
		})

		header.createEl('div', {
			text: '',
			cls: 'focus-tracker__cell--name focus-tracker__cell',
		})

		const currentDate = this.createDateFromFormat(
			this.settings.lastDisplayedDate,
		)
		currentDate.setDate(currentDate.getDate() - this.settings.daysToLoad + 1)
		for (let i = 0; i < this.settings.daysToLoad; i++) {
			const day = currentDate.getDate().toString()
			header.createEl('div', {
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
				const frontmatter = result.split('---')[1]

				if (!frontmatter) return {}

				return parseYaml(frontmatter)
			})
		} catch (error) {
			return {}
		}
	}

	async getFocusEntries(path: string) {
		// let entries = await this.getFrontmatter(path)?.entries || [];
		const fm = await this.getFrontmatter(path)
		// console.log(`Found ${fm.entries} for ${path}`);
		return fm.entries || []
	}

	renderFocus(path: string, entries: string[]) {
		// console.log('rendering a focus')
		if (!this.settings.focussGoHere) {
			new Notice(`${PLUGIN_NAME}: missing div that holds all focuss`)
			return null
		}
		const parent = this.settings.focussGoHere

		const name = path.split('/').pop()?.replace('.md', '')

		// no. this needs to be queried inside this.settings.rootElement;
		let row = parent.querySelector(`*[data-id="${this.pathToId(path)}"]`)

		if (!row) {
			row = this.settings.focussGoHere.createEl('div', {
				cls: 'focus-tracker__row',
			})
			row.setAttribute('data-id', this.pathToId(path))
		} else {
			this.removeAllChildNodes(row)
		}

		const focusTitle = row.createEl('div', {
			cls: 'focus-tracker__cell--name focus-tracker__cell',
		})

		const focusTitleLink = focusTitle.createEl('a', {
			text: name,
			cls: 'internal-link',
		})

		focusTitleLink.setAttribute('href', path)
		focusTitleLink.setAttribute('aria-label', path)

		const currentDate = this.createDateFromFormat(
			this.settings.lastDisplayedDate,
		)
		currentDate.setDate(currentDate.getDate() - this.settings.daysToLoad + 1) // todo, why +1?

		const entriesSet = new Set(entries)

		// console.log('entries', entries);
		for (let i = 0; i < this.settings.daysToLoad; i++) {
			const dateString = this.getDateId(currentDate)
			const isTicked = entriesSet.has(dateString)

			const focusCell = row.createEl('div', {
				cls: `focus-tracker__cell
				focus-tick focus-tick--${isTicked}
				focus-tracker__cell--${this.getDayOfWeek(currentDate)}`,
			})

			focusCell.setAttribute('ticked', isTicked.toString())

			focusCell.setAttribute('date', dateString)
			focusCell.setAttribute('focus', path)
			currentDate.setDate(currentDate.getDate() + 1)
		}
	}

	async toggleFocus(el) {
		const focus = el.getAttribute('focus')
		const date = el.getAttribute('date')
		const file: TAbstractFile|null = this.app.vault.getAbstractFileByPath(focus)
		const isTicked = el.getAttribute('ticked')

		if (!file ||!(file instanceof TFile)) {
			new Notice(`${PLUGIN_NAME}: file missing while trying to toggle focus`)
			return
		}

		this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			let entries = frontmatter['entries'] || []
			if (isTicked === 'true') {
				entries = entries.filter((e) => e !== date)
			} else {
				entries.push(date)
				entries.sort()
			}
			frontmatter['entries'] = entries
		})

		this.renderFocus(file.path, await this.getFocusEntries(file.path))
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
			.replaceAll('/', '_')
			.replaceAll('.', '__')
			.replaceAll(' ', '___')
	}

	createDateFromFormat(dateString) {
		const [year, month, day] = dateString.split('-').map(Number)
		const date = new Date()

		date.setFullYear(year)
		date.setMonth(month - 1)
		date.setDate(day)

		return date
	}

	getDateId(date) {
		const year = date.getFullYear()
		const month = String(date.getMonth() + 1).padStart(2, '0')
		const day = String(date.getDate()).padStart(2, '0')

		let dateId = `${year}-${month}-${day}`

		return dateId
	}

	getDayOfWeek(date) {
		const daysOfWeek = [
			'sunday',
			'monday',
			'tuesday',
			'wednesday',
			'thursday',
			'friday',
			'saturday',
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
