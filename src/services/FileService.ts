import { App, TFile, TAbstractFile, parseYaml, CachedMetadata } from "obsidian";
import { Notice } from "obsidian";
import {
    FocusLogsType,
} from '../types';
import {
    PLUGIN_NAME,
} from '../constants';
import {
    normalizeLogs,
} from '../utils/formatting';
import { patternsToRegex } from '../utils/strings';
import { FocusTrackerConfiguration } from '../types';
import { isSameDate } from '../utils/dates';

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

    async getFileDisplayHeadingAndValue(path: string, titlePropertyNames: string[]): Promise<[string, string]> {
        let fileDisplayHeading = "Track";
        let fileDisplayLabel = path.split('/').pop()?.replace('.md', '') || path;
        if (titlePropertyNames?.length > 0) {
            let frontmatter = await this.getFrontmatter(path) || {};
            titlePropertyNames.slice().reverse().forEach((propertyName: string) => {
                if (frontmatter[propertyName]) {
                    fileDisplayHeading = propertyName;
                    fileDisplayLabel = frontmatter[propertyName] || fileDisplayLabel;
                }
            });
        }
        return [fileDisplayHeading, fileDisplayLabel];
    }

    async getFocusTargetLabel(path: string, titlePropertyNames: string[]): Promise<string> {
        const [, focusTargetLabel] = await this.getFileDisplayHeadingAndValue(path, titlePropertyNames);
        return focusTargetLabel;
    }

    async readFocusLogs(path: string, logPropertyName: string): Promise<FocusLogsType> {
        const frontmatter = await this.getFrontmatter(path);
        const fmLogs = frontmatter[logPropertyName] || {};
        return normalizeLogs(fmLogs);
    }

    loadFiles(config: FocusTrackerConfiguration): TFile[] {
        // Ensure config and its properties exist
        if (!config) {
            return [];
        }

        // Safe access to configuration properties with defaults
        const paths = config.paths || [];
        const tags = config.tags || [];
        const tagSet = config.tagSet || [];
        const excludeTags = config.excludeTags || [];
        const excludeTagSet = config.excludeTagSet || [];
        const properties = config.properties || {};

        let pathPatterns = patternsToRegex(paths);
        let tagAnyPatterns = patternsToRegex(tags.map(s => s.replace(/^#/, "")));
        let tagSetPatterns = patternsToRegex(tagSet.map(s => s.replace(/^#/, "")));
        let excludeTagPatterns = patternsToRegex(excludeTags.map(s => s.replace(/^#/, "")));
        let excludeTagSetPatterns = patternsToRegex(excludeTagSet.map(s => s.replace(/^#/, "")));

        // Safely get markdown files
        const markdownFiles = this.app.vault.getMarkdownFiles() || [];

        return markdownFiles
            .filter((file: TFile) => this.fileMatchesFilters(file, {
                pathPatterns,
                tagAnyPatterns,
                tagSetPatterns,
                excludeTagPatterns,
                excludeTagSetPatterns,
                properties
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

