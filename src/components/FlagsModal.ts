import { App, Modal, TextAreaComponent } from 'obsidian';

export class FlagsModal extends Modal {
    private allFlagsInput: TextAreaComponent;
    private selectedFlags: string[];
    private onSave: (flags: string[]) => void;

    constructor(app: App, initialFlags: string[] = [], onSave?: (flags: string[]) => void) {
        super(app);
        this.selectedFlags = [...initialFlags];
        this.onSave = onSave ?? (() => {});
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h3', { text: 'Add / Remove Flags' });

        const instructions = contentEl.createEl('div', { cls: 'flags-modal-instructions' });
        instructions.setText('Paste emoji or codes (e.g. :rocket:). Use << and >> to add/remove the selected flags from the palette.');

        // Current selection display
        const selectedContainer = contentEl.createEl('div', { cls: 'flags-selected-container' });
        selectedContainer.createEl('label', { text: 'Selected flags:' });
        const selectedList = selectedContainer.createEl('div', { cls: 'flags-selected-list' });

        const refreshSelected = () => {
            selectedList.empty();
            this.selectedFlags.forEach((f, idx) => {
                const el = selectedList.createEl('button', { cls: 'flag-chip', text: f });
                el.onclick = () => {
                    // remove flag on click
                    this.selectedFlags.splice(idx, 1);
                    refreshSelected();
                };
            });
        };

        refreshSelected();

        // Input to paste or type flags
        contentEl.createEl('label', { text: 'Paste flags / codes (separated by spaces):' });
        this.allFlagsInput = new TextAreaComponent(contentEl);
        this.allFlagsInput.setPlaceholder('e.g. 🚀 ✅ :sparkles:');
        this.allFlagsInput.setValue('');

        const paletteContainer = contentEl.createEl('div', { cls: 'flags-palette-container' });
        paletteContainer.createEl('label', { text: 'Palette (click to select):' });

        // Very small built-in palette for convenience. User can paste more in the textarea.
        const palette = ['⭐','✅','🚀','🔥','✨','🧠','💡','🔔','⚠️','❌','✅','➕','➖'];
        const paletteGrid = paletteContainer.createEl('div', { cls: 'flags-palette-grid' });
        palette.forEach((p) => {
            const b = paletteGrid.createEl('button', { cls: 'flag-palette-item', text: p });
            b.onclick = () => {
                // toggle in selectedFlags
                const idx = this.selectedFlags.indexOf(p);
                if (idx === -1) this.selectedFlags.push(p);
                else this.selectedFlags.splice(idx, 1);
                refreshSelected();
            };
        });

        // Add / Remove selected to/from palette using << / >> buttons
        const actions = contentEl.createEl('div', { cls: 'flags-actions' });
        // const addButton = actions.createEl('button', { text: '<< Add selected to list' });
        // const removeButton = actions.createEl('button', { text: 'Remove selected >>' });

        // addButton.onclick = () => {
        //     // parse textarea into tokens and add to selected
        //     const tokens = this.tokenizeFlags(this.allFlagsInput.getValue());
        //     tokens.forEach(t => {
        //         if (!this.selectedFlags.includes(t)) this.selectedFlags.push(t);
        //     });
        //     refreshSelected();
        // };

        // removeButton.onclick = () => {
        //     const tokens = this.tokenizeFlags(this.allFlagsInput.getValue());
        //     tokens.forEach(t => {
        //         const idx = this.selectedFlags.indexOf(t);
        //         if (idx !== -1) this.selectedFlags.splice(idx, 1);
        //     });
        //     refreshSelected();
        // };

        // Save / Cancel
        const buttons = contentEl.createEl('div', { cls: 'flags-modal-buttons' });
        const cancelBtn = buttons.createEl('button', { text: 'Cancel' });
        cancelBtn.onclick = () => this.close();

        const saveBtn = buttons.createEl('button', { cls: 'mod-cta', text: 'Save' });
        saveBtn.onclick = () => {
            // combine current selected and any tokens in textarea
            const tokens = this.tokenizeFlags(this.allFlagsInput.getValue());
            tokens.forEach(t => { if (!this.selectedFlags.includes(t)) this.selectedFlags.push(t); });
            this.onSave(this.selectedFlags);
            this.close();
        };
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    private tokenizeFlags(input: string): string[] {
        if (!input) return [];
        // split by whitespace and commas
        return input
            .split(/[,\s]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }
}
