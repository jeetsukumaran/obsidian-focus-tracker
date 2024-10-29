import { App, Modal, Setting } from "obsidian";

export class RemarksModal extends Modal {
    private result: string;
    private onSubmit: (result: string) => void;
    private initialValue: string;

    constructor(app: App, initialValue: string, onSubmit: (result: string) => void) {
        super(app);
        this.initialValue = initialValue;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h2", { text: "Enter Remarks" });

        new Setting(contentEl)
            .setName("Remarks")
            .addText((text) =>
                text
                    .setValue(this.initialValue)
                    .onChange((value) => {
                        this.result = value;
                    })
                    .inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            this.close();
                            this.onSubmit(this.result || "");
                        }
                    }));

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Save")
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.onSubmit(this.result || "");
                    }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
