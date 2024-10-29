import { App, PluginSettingTab, Setting, SliderComponent } from 'obsidian';
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

type NumberSettingKey = {
    [K in keyof FocusTrackerSettings]: FocusTrackerSettings[K] extends number ? K : never
}[keyof FocusTrackerSettings];

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

        this.createDualInputSetting(
            containerEl,
            'Minimum Days Past',
            'Minimum number of past days that can be displayed',
            'minDaysPast',
            1,
            30
        );

        this.createDualInputSetting(
            containerEl,
            'Default Days Past',
            'Default number of past days to display',
            'defaultDaysPast',
            this.plugin.settings.minDaysPast,
            30
        );

        this.createDualInputSetting(
            containerEl,
            'Minimum Days Future',
            'Minimum number of future days that can be displayed',
            'minDaysFuture',
            1,
            30
        );

        this.createDualInputSetting(
            containerEl,
            'Default Days Future',
            'Default number of future days to display',
            'defaultDaysFuture',
            this.plugin.settings.minDaysFuture,
            30
        );
    }

    private createDualInputSetting(
        containerEl: HTMLElement,
        name: string,
        desc: string,
        settingKey: NumberSettingKey,
        min: number,
        max: number
    ): void {
        const setting = new Setting(containerEl)
            .setName(name)
            .setDesc(desc);

        let sliderComponent: SliderComponent;

        // Add text input
        setting.addText(text => {
            const textComponent = text
                .setPlaceholder(min.toString())
                .setValue(this.plugin.settings[settingKey].toString())
                .onChange(async (value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
                        this.plugin.settings[settingKey] = numValue;
                        await this.plugin.saveSettings();
                        // Update slider
                        if (sliderComponent) {
                            sliderComponent.setValue(numValue);
                        }
                    }
                });

            // Add number input validation
            textComponent.inputEl.type = 'number';
            textComponent.inputEl.setAttr('min', min.toString());
            textComponent.inputEl.setAttr('max', max.toString());

            return textComponent;
        });

        // Add slider with proper component capture
        setting.addSlider(slider => {
            sliderComponent = slider;
            return slider
                .setLimits(min, max, 1)
                .setValue(this.plugin.settings[settingKey])
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings[settingKey] = value;
                    await this.plugin.saveSettings();
                    // Update text input
                    const textInputs = setting.controlEl.querySelectorAll('input[type="number"]');
                    if (textInputs.length > 0) {
                        (textInputs[0] as HTMLInputElement).value = value.toString();
                    }
                });
        });

        // Add value display
        setting.controlEl.createSpan({
            text: `Current: ${this.plugin.settings[settingKey]}`,
            cls: 'setting-item-value'
        });
    }
}
