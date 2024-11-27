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

        // For other columns, we need frontmatter
        const fileLabels = await Promise.all(
            files.map(async (f) => {
                const frontmatter = await this.fileService.getFrontmatter(f.path);
                const label = await this.fileService.getFocusTargetLabel(f.path, configuration.titlePropertyNames);
                const value = frontmatter[sortColumn];
                const sortValue = formatFrontmatterValue(value).toLowerCase();
                return [label, f, sortValue] as [string, TFile, string];
            })
        );

        return this.sortFileLabels(fileLabels, configuration.sortDescending);
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
