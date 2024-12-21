import { TFile } from "obsidian";
import { FileService } from './FileService';
import { FocusTrackerConfiguration } from '../types';
import { formatFrontmatterValue } from '../utils/formatting';

export class SortingService {
    constructor(private fileService: FileService) {}

    async sortFiles(files: TFile[], configuration: FocusTrackerConfiguration): Promise<[string, TFile][]> {
        if (!files || files.length === 0) {
            return [];
        }

        let sortColumn = configuration.sortColumn;

        // If no sort column is set, use first prefix column or 'track'
        if (!sortColumn) {
            const prefixColumns = Object.values(configuration.prefixColumns || {});
            sortColumn = prefixColumns.length > 0 ? prefixColumns[0] : 'track';
            configuration.sortColumn = sortColumn;
        }

        try {
            // If sorting by track, we can skip getting frontmatter
            if (sortColumn === 'track') {
                const fileLabels = await Promise.all(
                    files.map(async (f) => {
                        try {
                            const label = await this.fileService.getFocusTargetLabel(f.path, configuration.titlePropertyNames) || '';
                            return [label, f, String(label).toLowerCase()] as [string, TFile, string];
                        } catch (error) {
                            console.error(`Error processing file ${f.path}:`, error);
                            return ['', f, ''] as [string, TFile, string];
                        }
                    })
                );

                return this.sortFileLabels(fileLabels, configuration.sortDescending);
            }

            // For other columns, get frontmatter and handle tag patterns
            const fileLabels = await Promise.all(
                files.map(async (f) => {
                    try {
                        const frontmatter = await this.fileService.getFrontmatter(f.path) || {};
                        const label = await this.fileService.getFocusTargetLabel(f.path, configuration.titlePropertyNames) || '';

                        let sortValue = '';
                        // Check if this is a tag pattern column (starts with #)
                        const columnDef = this.findColumnDefinition(sortColumn, configuration);
                        if (columnDef?.startsWith('#')) {
                            sortValue = this.extractTagValue(frontmatter.tags, columnDef.slice(1)) || '';
                        } else {
                            const value = frontmatter[sortColumn];
                            sortValue = formatFrontmatterValue(value);
                        }

                        return [label, f, sortValue.toLowerCase()] as [string, TFile, string];
                    } catch (error) {
                        console.error(`Error processing file ${f.path}:`, error);
                        return ['', f, ''] as [string, TFile, string];
                    }
                })
            );

            return this.sortFileLabels(fileLabels, configuration.sortDescending);
        } catch (error) {
            console.error('Error in sortFiles:', error);
            return files.map(f => ['', f] as [string, TFile]);
        }
    }

    private findColumnDefinition(columnName: string, configuration: FocusTrackerConfiguration): string | undefined {
        if (!columnName || !configuration) return undefined;

        const prefixColumns = configuration.prefixColumns || {};
        const postfixColumns = configuration.postfixColumns || {};

        // Look for the column definition in both prefix and postfix columns
        for (const [display, field] of Object.entries(prefixColumns)) {
            if (display === columnName) return field;
        }
        for (const [display, field] of Object.entries(postfixColumns)) {
            if (display === columnName) return field;
        }
        return undefined;
    }

    private extractTagValue(tags: string | string[] | undefined | null, pattern: string): string {
        if (!tags || !pattern) return '';

        try {
            const rx = new RegExp(pattern, 'g');
            const tagArray = Array.isArray(tags) ? tags : [String(tags)];

            for (const tag of tagArray) {
                if (!tag) continue;
                const matches = Array.from(tag.matchAll(rx));
                for (const match of matches) {
                    if (match[1]) {
                        return match[1];
                    } else if (match[0]) {
                        return match[0];
                    }
                }
            }
        } catch (error) {
            console.error('Error extracting tag value:', error);
        }
        return '';
    }

    private sortFileLabels(
        fileLabels: [string, TFile, string][],
        sortDescending: boolean
    ): [string, TFile][] {
        if (!fileLabels) return [];

        return fileLabels
            .sort(([labelA, fileA, valueA], [labelB, fileB, valueB]) => {
                // Ensure we have string values to compare
                const safeValueA = String(valueA || '');
                const safeValueB = String(valueB || '');
                const safeLabelA = String(labelA || '');
                const safeLabelB = String(labelB || '');

                // First sort by the class/category value
                const classComparison = safeValueA.localeCompare(safeValueB);
                if (classComparison !== 0) {
                    return sortDescending ? -classComparison : classComparison;
                }

                // If classes are equal, sort by track name
                const trackComparison = safeLabelA.localeCompare(safeLabelB);
                return sortDescending ? -trackComparison : trackComparison;
            })
            .map(([label, file]) => [label, file]);
    }
}
