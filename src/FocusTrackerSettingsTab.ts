import { App, PluginSettingTab, Setting } from 'obsidian';
import FocusTrackerPlugin from './main';
import { DEFAULT_MAPS, DEFAULT_CONFIG } from './constants';

export interface FocusTrackerSettings {
    defaultRatingMap: keyof typeof DEFAULT_MAPS.ratings;
    defaultFlagMap: keyof typeof DEFAULT_MAPS.flags;
    minDaysPast: number;
    minDaysFuture: number;
    defaultDaysPast: number;
    defaultDaysFuture: number;
}

export const DEFAULT_SETTINGS: FocusTrackerSettings = {
    defaultRatingMap: DEFAULT_CONFIG.ratingMap,
    defaultFlagMap: DEFAULT_CONFIG.flagMap,
    minDaysPast: 1,
    minDaysFuture: 1,
    defaultDaysPast: DEFAULT_CONFIG.daysPast,
    defaultDaysFuture: DEFAULT_CONFIG.daysFuture,
};

export class FocusTrackerSettingsTab extends PluginSettingTab {
    plugin: FocusTrackerPlugin;

    constructor(app: App, plugin: FocusTrackerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Focus Tracker Settings' });

        // Default Rating Map
        new Setting(containerEl)
            .setName('Default Rating Map')
            .setDesc('Choose the default rating map for new focus trackers')
            .addDropdown(dropdown => dropdown
                .addOptions(Object.fromEntries(
                    Object.keys(DEFAULT_MAPS.ratings).map(key => [key, key])
                ))
                .setValue(this.plugin.settings.defaultRatingMap)
                .onChange(async (value) => {
                    this.plugin.settings.defaultRatingMap = value as keyof typeof DEFAULT_MAPS.ratings;
                    await this.plugin.saveSettings();
                }));

        // Default Flag Map
        new Setting(containerEl)
            .setName('Default Flag Map')
            .setDesc('Choose the default flag map for new focus trackers')
            .addDropdown(dropdown => dropdown
                .addOptions(Object.fromEntries(
                    Object.keys(DEFAULT_MAPS.flags).map(key => [key, key])
                ))
                .setValue(this.plugin.settings.defaultFlagMap)
                .onChange(async (value) => {
                    this.plugin.settings.defaultFlagMap = value as keyof typeof DEFAULT_MAPS.flags;
                    await this.plugin.saveSettings();
                }));

        // Minimum Days Past
        new Setting(containerEl)
            .setName('Minimum Days Past')
            .setDesc('Minimum number of past days that can be displayed')
            .addSlider(slider => slider
                .setLimits(1, 30, 1)
                .setValue(this.plugin.settings.minDaysPast)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.minDaysPast = value;
                    await this.plugin.saveSettings();
                }));

        // Default Days Past
        new Setting(containerEl)
            .setName('Default Days Past')
            .setDesc('Default number of past days to display in new focus trackers')
            .addSlider(slider => slider
                .setLimits(
                    this.plugin.settings.minDaysPast,
                    30,
                    1
                )
                .setValue(this.plugin.settings.defaultDaysPast)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.defaultDaysPast = value;
                    await this.plugin.saveSettings();
                }));

        // Minimum Days Future
        new Setting(containerEl)
            .setName('Minimum Days Future')
            .setDesc('Minimum number of future days that can be displayed')
            .addSlider(slider => slider
                .setLimits(1, 30, 1)
                .setValue(this.plugin.settings.minDaysFuture)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.minDaysFuture = value;
                    await this.plugin.saveSettings();
                }));

        // Default Days Future
        new Setting(containerEl)
            .setName('Default Days Future')
            .setDesc('Default number of future days to display in new focus trackers')
            .addSlider(slider => slider
                .setLimits(
                    this.plugin.settings.minDaysFuture,
                    30,
                    1
                )
                .setValue(this.plugin.settings.defaultDaysFuture)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.defaultDaysFuture = value;
                    await this.plugin.saveSettings();
                }));
    }
}
