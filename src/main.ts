import { Plugin } from 'obsidian';
import FocusTracker from './FocusTracker';
import { FocusTrackerConfiguration } from './types';
import {
    FocusTrackerSettingsTab,
    FocusTrackerSettings,
    DEFAULT_SETTINGS
} from './FocusTrackerSettingsTab';

export default class FocusTrackerPlugin extends Plugin {
    settings: FocusTrackerSettings;
    focusTrackers: FocusTracker[] = [];

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new FocusTrackerSettingsTab(this.app, this));

        this.registerMarkdownCodeBlockProcessor(
            'focustracker',
            async (src, el, ctx) => {
                let ft = new FocusTracker(src, el, ctx, this.app, this.settings);
                this.focusTrackers.push(ft);
            },
        );

        this.addCommand({
            id: 'refresh-focus-trackers',
            name: 'Refresh focus trackers',
            callback: () => {
                this.focusTrackers.forEach((ft: FocusTracker) => ft.refresh());
            }
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Refresh all trackers to apply new settings
        this.focusTrackers.forEach((ft: FocusTracker) => ft.refresh());
    }
}
