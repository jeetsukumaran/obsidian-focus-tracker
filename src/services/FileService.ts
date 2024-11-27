import { App, TFile, TAbstractFile, parseYaml, CachedMetadata } from "obsidian";
import { Notice } from "obsidian";
import { PLUGIN_NAME } from '../constants';
import { patternsToRegex } from '../utils/strings';
import { FocusTrackerConfiguration } from '../types';

export class FileService {
    constructor(private app: App) {}

    async getFrontmatter(path: string): Promise<{[key: string]: any}> {
        const file: TAbstractFile|null = this.app.vault.getAbstractFileByPath(path);
        if (!file || !(file instanceof TFile)) {
            new Notice(`${PLUGIN_NAME}: No file found for path: ${path}`);
            return {};
        }

        try {
            const content = await this.app.vault.read(file);
            const frontmatter = content.split("---")[1];
            if (!frontmatter) {
                return {};
            }
            return parseYaml(frontmatter);
        } catch (error) {
            return {};
        }
    }

    async getFocusTargetLabel(path: string, titlePropertyNames: string[]): Promise<string> {
        let focusTargetLabel = path.split('/').pop()?.replace('.md', '') || path;
        if (titlePropertyNames?.length > 0) {
            let frontmatter = await this.getFrontmatter(path) || {};
            titlePropertyNames.slice().reverse().forEach((propertyName: string) => {
                if (frontmatter[propertyName]) {
                    focusTargetLabel = frontmatter[propertyName] || focusTargetLabel;
                }
            });
        }
        return focusTargetLabel;
    }

    async readFocusLogs(path: string, logPropertyName: string): Promise<FocusLogsType> {
        const frontmatter = await this.getFrontmatter(path);
        const fmLogs = frontmatter[logPropertyName] || {};
        return normalizeLogs(fmLogs);
    }

    loadFiles(config: FocusTrackerConfiguration): TFile[] {
        let pathPatterns = patternsToRegex(config.paths);
        let tagAnyPatterns = patternsToRegex(config.tags.map(s => s.replace(/^#/,"")));
        let tagSetPatterns = patternsToRegex(config.tagSet.map(s => s.replace(/^#/,"")));
        let excludeTagPatterns = patternsToRegex((config.excludeTags || []).map(s => s.replace(/^#/,"")));
        let excludeTagSetPatterns = patternsToRegex((config.excludeTagSet || []).map(s => s.replace(/^#/,"")));

        return this.app.vault
            .getMarkdownFiles()
            .filter((file: TFile) => this.fileMatchesFilters(file, {
                pathPatterns,
                tagAnyPatterns,
                tagSetPatterns,
                excludeTagPatterns,
                excludeTagSetPatterns,
                properties: config.properties
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    private fileMatchesFilters(file: TFile, filters: FileFilters): boolean {
        let fileMetadata = this.getMetadata(file);
        let frontmatter = fileMetadata?.frontmatter || {};
        let fileTags = this.extractTags(fileMetadata);

        // Path filtering
        if (filters.pathPatterns.length > 0 && !filters.pathPatterns.some(rx => rx.test(file.path))) {
            return false;
        }

        // Tag-any (OR) filtering
        if (filters.tagAnyPatterns.length > 0 && !filters.tagAnyPatterns.some(rx => fileTags.some(tag => rx.test(tag)))) {
            return false;
        }

        // Tag-set (AND) filtering
        if (filters.tagSetPatterns.length > 0 && !filters.tagSetPatterns.every(rx => fileTags.some(tag => rx.test(tag)))) {
            return false;
        }

        // Exclude tags (OR) - exclude if ANY match
        if (filters.excludeTagPatterns.length > 0 && filters.excludeTagPatterns.some(rx => fileTags.some(tag => rx.test(tag)))) {
            return false;
        }

        // Exclude tag-set (AND) - exclude if ALL match
        if (filters.excludeTagSetPatterns.length > 0 && filters.excludeTagSetPatterns.every(rx => fileTags.some(tag => rx.test(tag)))) {
            return false;
        }

        // Property filtering
        if (Object.keys(filters.properties).length > 0) {
            if (!frontmatter) return false;
            if (!Object.keys(filters.properties).some(key => frontmatter[key] === filters.properties[key])) {
                return false;
            }
        }

        return true;
    }

    private getMetadata(file: TFile): CachedMetadata | null {
        return this.app.metadataCache.getFileCache(file) || null;
    }

    private extractTags(metadata: CachedMetadata | null): string[] {
        if (!metadata) return [];

        const tagSet = new Set<string>();

        // Extract tags from frontmatter
        if (metadata.frontmatter?.tags) {
            const fmTags = metadata.frontmatter.tags;
            if (Array.isArray(fmTags)) {
                fmTags.forEach(tag => {
                    tagSet.add(typeof tag === 'string' ? tag.replace(/^#/, '') : '');
                });
            } else if (typeof fmTags === 'string') {
                fmTags.split(/[,\s]+/).forEach(tag => {
                    tagSet.add(tag.replace(/^#/, ''));
                });
            }
        }

        // Extract inline tags
        if (metadata.tags) {
            metadata.tags.forEach(tag => {
                tagSet.add(tag.tag.replace(/^#/, ''));
            });
        }

        return Array.from(tagSet).filter(tag => tag !== '');
    }
}

interface FileFilters {
    pathPatterns: RegExp[];
    tagAnyPatterns: RegExp[];
    tagSetPatterns: RegExp[];
    excludeTagPatterns: RegExp[];
    excludeTagSetPatterns: RegExp[];
    properties: Record<string, any>;
}

