import { App, Modal, Setting } from 'obsidian';

import {
    DEFAULT_MAPS
} from "../constants";

export class FlagsModal extends Modal {
    private selectedFlags: (string | [string, string])[];
    private onSave: (flags: (string | [string, string])[]) => void;
    private originalFlags: (string | [string, string])[];

    constructor(app: App, initialFlags: (string | [string, string])[] = [], onSave?: (flags: (string | [string, string])[]) => void) {
        super(app);
        this.originalFlags = [...initialFlags];
        this.selectedFlags = [...initialFlags];
        this.onSave = onSave ?? (() => {});
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h3', { text: 'Add / Remove Flags' });

        const instructions = contentEl.createEl('div', { cls: 'flags-modal-instructions' });
        instructions.setText('Click items on the left to remove; click items on the right to add.');

        // Two column layout: left = current, right = available
        const cols = contentEl.createDiv({ cls: 'flags-modal-columns' });
        const leftCol = cols.createDiv({ cls: 'flags-modal-column flags-current' });
        const rightCol = cols.createDiv({ cls: 'flags-modal-column flags-available' });

        leftCol.createEl('label', { text: 'Current flags' });
        const selectedList = leftCol.createDiv({ cls: 'flags-selected-list' });

        rightCol.createEl('label', { text: 'Available flags' });
        const availableContainer = rightCol.createDiv({ cls: 'flags-all-palettes' });

        const refreshSelected = () => {
            selectedList.empty();
            this.selectedFlags.forEach((f, idx) => {
                const flagText = Array.isArray(f) ? f[0] : f;
                const el = selectedList.createEl('button', { 
                    cls: 'flag-chip', 
                    text: flagText 
                });
                if (Array.isArray(f)) {
                    el.setAttribute('title', `${f[0]}  ${f[1]}`);
                }
                el.onclick = () => {
                    this.selectedFlags.splice(idx, 1);
                    refreshSelected();
                };
            });
        };

        // Render available flags grouped by map
        const renderAvailable = () => {
            availableContainer.empty();
            Object.entries(DEFAULT_MAPS.flags).forEach(([mapName, flagMap]) => {
                const paletteGroupContainer = availableContainer.createDiv({ cls: 'flags-palette-group' });
                paletteGroupContainer.createDiv({ 
                    cls: 'flags-palette-group-label', 
                    text: mapName.charAt(0).toUpperCase() + mapName.slice(1) 
                });
                const paletteGrid = paletteGroupContainer.createDiv({ cls: 'flags-palette-grid' });

                flagMap.flags.forEach(([symbol, key]) => {
                    const button = paletteGrid.createEl('button', { 
                        cls: 'flag-palette-item', 
                        text: symbol,
                    });
                    if (key) button.setAttribute('title', key);

                    button.onclick = () => {
                        // Store as tuple in selectedFlags
                        if (!this.selectedFlags.some(f => Array.isArray(f) ? f[0] === symbol : f === symbol)) {
                            this.selectedFlags.push([symbol, key]);
                            refreshSelected();
                        }
                    };
                });
            });
        };

        // Initial render
        refreshSelected();
        renderAvailable();

        // Footer buttons using Setting for consistent styling
        const footer = contentEl.createDiv({ cls: 'flags-modal-footer' });
        
        new Setting(footer)
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()))
            .addButton(btn => btn
                .setButtonText('Clear')
                .onClick(() => {
                    this.selectedFlags = [];
                    refreshSelected();
                }))
            .addButton(btn => btn
                .setButtonText('Reset')
                .onClick(() => {
                    this.selectedFlags = [...this.originalFlags];
                    refreshSelected();
                }))
            .addButton(btn => btn
                .setButtonText('Save')
                .setCta()
                .onClick(() => {
                    this.onSave(this.selectedFlags);
                    this.close();
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
