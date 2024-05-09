import {
    Plugin,
} from 'obsidian'
import FocusTracker from './FocusTracker'

const PLUGIN_NAME = 'Focus Tracker'

export default class FocusTracker21 extends Plugin {
	async onload() {
		console.log(`${PLUGIN_NAME}: loading...`)
		this.app.workspace.trigger("parse-style-settings")
		this.registerMarkdownCodeBlockProcessor(
			'focustracker',
			async (src, el, ctx) => {
				new FocusTracker(src, el, ctx, this.app)
			},
		)
	}
}
