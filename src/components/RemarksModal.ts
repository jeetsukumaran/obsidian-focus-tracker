import { App, Modal, TextAreaComponent } from "obsidian";

export class RemarksModal extends Modal {
    private result: string;
    private onSubmit: (result: string) => void;
    private textArea: TextAreaComponent;

    constructor(
        app: App,
        initialValue: string,
        onSubmit: (result: string) => void
    ) {
        super(app);
        this.result = initialValue;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h3", { text: "Enter Remarks" });

        this.textArea = new TextAreaComponent(contentEl);
        this.textArea
            .setValue(this.result)
            .onChange((value) => {
                this.result = value;
            });
        this.textArea.inputEl.classList.add("focus-tracker-remarks-input");
        this.textArea.inputEl.focus();

        const buttonContainer = contentEl.createEl("div", {
            cls: "focus-tracker-remarks-buttons",
        });

        buttonContainer.createEl("button", { text: "Cancel" }).onclick = () => {
            this.close();
        };

        const submitButton = buttonContainer.createEl("button", {
            cls: "mod-cta",
            text: "Submit",
        });
        submitButton.onclick = () => {
            this.onSubmit(this.result);
            this.close();
        };
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}


// import { App, Modal, Setting } from "obsidian";

// export class RemarksModal extends Modal {
//     private result: string;
//     private onSubmit: (result: string) => void;
//     private initialValue: string;

//     constructor(app: App, initialValue: string, onSubmit: (result: string) => void) {
//         super(app);
//         this.initialValue = initialValue;
//         this.onSubmit = onSubmit;
//     }

//     onOpen() {
//         const { contentEl } = this;

//         contentEl.createEl("h2", { text: "Enter Remarks" });

//         new Setting(contentEl)
//             .setName("Remarks")
//             .addText((text) =>
//                 text
//                     .setValue(this.initialValue)
//                     .onChange((value) => {
//                         this.result = value;
//                     })
//                     .inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
//                         if (e.key === "Enter") {
//                             e.preventDefault();
//                             this.close();
//                             this.onSubmit(this.result || "");
//                         }
//                     }));

//         new Setting(contentEl)
//             .addButton((btn) =>
//                 btn
//                     .setButtonText("Save")
//                     .setCta()
//                     .onClick(() => {
//                         this.close();
//                         this.onSubmit(this.result || "");
//                     }));
//     }

//     onClose() {
//         const { contentEl } = this;
//         contentEl.empty();
//     }
// }
