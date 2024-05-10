import {
    Plugin,
} from 'obsidian'
import FocusTracker from './FocusTracker'

const PLUGIN_NAME = 'Focus Tracker'

export default class FocusTrackerPlugin extends Plugin {
	async onload() {
		// this.app.workspace.trigger("parse-style-settings")
		this.registerMarkdownCodeBlockProcessor(
			'focustracker',
			async (src, el, ctx) => {
				new FocusTracker(src, el, ctx, this.app)
			},
		)
	}
}
