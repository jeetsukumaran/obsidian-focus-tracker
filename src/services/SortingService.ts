import { TFile } from "obsidian";
import { FileService } from './FileService';
import { FocusTrackerConfiguration } from '../types';
import { formatFrontmatterValue } from '../utils/formatting';

export class SortingService {
    constructor(private fileService: FileService) {}

    async sortFiles(files: TFile[], configuration: FocusTrackerConfiguration): Promise<[string, TFile][]> {
        let sortColumn = configuration.sortColumn;

        // If no sort column is set, use first prefix column or 'track'
        if (!sortColumn) {
            const prefixColumns = Object.values(configuration.prefixColumns);
            sortColumn = prefixColumns.length > 0 ? prefixColumns[0] : 'track';
            configuration.sortColumn = sortColumn;
        }

        // If sorting by track, we can skip getting frontmatter
        if (sortColumn === 'track') {
            const fileLabels = await Promise.all(
                files.map(async (f) => {
                    const label = await this.fileService.getFocusTargetLabel(f.path, configuration.titlePropertyNames);
                    return [label, f, label.toLowerCase()] as [string, TFile, string];
                })
            );

            return this.sortFileLabels(fileLabels, configuration.sortDescending);
        }

        // For other columns, get frontmatter and handle tag patterns
        const fileLabels = await Promise.all(
            files.map(async (f) => {
                const frontmatter = await this.fileService.getFrontmatter(f.path);
                const label = await this.fileService.getFocusTargetLabel(f.path, configuration.titlePropertyNames);

                let sortValue = "";
                // Check if this is a tag pattern column (starts with #)
                if (sortColumn?.startsWith("#")) {
                    sortValue = this.extractTagValue(frontmatter.tags, sortColumn.slice(1)) || "";
                } else {
                    const value = frontmatter[sortColumn];
                    sortValue = formatFrontmatterValue(value);
                }

                return [label, f, sortValue.toLowerCase()] as [string, TFile, string];
            })
        );

        return this.sortFileLabels(fileLabels, configuration.sortDescending);
    }
    private extractTagValue(tags: string | string[] | undefined, pattern: string): string {
        if (!tags) return "";

        const rx = new RegExp(pattern, "g");
        const tagArray = Array.isArray(tags) ? tags : [String(tags)];

        for (const tag of tagArray) {
            const matches = tag.matchAll(rx);
            for (const match of matches) {
                if (match[1]) {
                    return match[1];
                } else {
                    return match[0];
                }
            }
        }
        return "";
    }

    private sortFileLabels(
        fileLabels: [string, TFile, string][],
        sortDescending: boolean
    ): [string, TFile][] {
        return fileLabels
            .sort(([labelA, fileA, valueA], [labelB, fileB, valueB]) => {
                const comparison = valueA.localeCompare(valueB);
                return sortDescending ? -comparison : comparison;
            })
            .map(([label, file]) => [label, file]);
    }
}
