import { Plugin } from 'obsidian';
import FocusTracker from './FocusTracker';
import { FocusTrackerConfiguration } from './types';

const PLUGIN_NAME = 'Focus Tracker'

export default class FocusTrackerPlugin extends Plugin {
    focusTrackers: FocusTracker[] = [];

	async onload() {
		// this.app.workspace.trigger("parse-style-settings")
		this.registerMarkdownCodeBlockProcessor(
			'focustracker',
			async (src, el, ctx) => {
				let ft = new FocusTracker(src, el, ctx, this.app);
				this.focusTrackers.push(ft);
			},
		)
        this.addCommand({
            id: 'refresh-focus-trackers',
            name: 'Refresh focus trackers',
            callback: () => {
                this.focusTrackers.forEach( (ft: FocusTracker) => ft.refresh() );
            }
        });
	}

}
