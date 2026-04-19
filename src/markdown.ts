/**
 * @file markdown.ts
 * Specialized service for rendering Markdown-like syntax to HTML.
 */

export interface MarkdownRule {
    label: string;
    example: string;
}

export class MarkdownEngine {
    /**
     * Returns a list of supported markdown rules for UI help.
     */
    static getSupportedRules(): MarkdownRule[] {
        return [
            { label: 'H1', example: '# Haupt-Kapitel' },
            { label: 'H2', example: '## Unter-Kapitel' },
            { label: 'H3', example: '### Abschnitt' },
            { label: 'fett', example: '**Text**' },
            { label: 'kursiv', example: '*Text*' },
            { label: 'fett+kursiv', example: '***Text***' },
            { label: 'gestrichen', example: '~~Text~~' },
            { label: 'Linie', example: '---' },
            { label: 'Liste', example: '* Item' },
            { label: 'Nr. Liste', example: '1. Item' },
            { label: 'Inline-Link', example: '[Text](url)' },
            { label: 'Ref-Link', example: '[Text][id]' },
            { label: 'Definition', example: '[id]: url' },
            { label: 'Icon', example: '[icon:file-text]' },
            { label: 'Unterschrift', example: '[caption:Text]' }
        ];
    }

    /**
     * Renders a Markdown string to HTML.
     */
    static render(text: string): string {
        if (!text) return '';
        
        // 1. Identify all reference definitions: [id]: url
        const references: Record<string, string> = {};
        const refDefRegex = /^\[([^\]]+)\]:\s*(https?:\/\/[^\s]+)$/gim;
        let match;
        while ((match = refDefRegex.exec(text)) !== null) {
            references[match[1].toLowerCase()] = match[2];
        }

        // 2. Pre-process Code Blocks to avoid escaping/rendering inside them
        const codeBlocks: string[] = [];
        let html = text.replace(/```mermaid\n?([\s\S]*?)\n?```/gim, (match, content) => {
            // Escape special HTML characters inside the mermaid block
            const escapedContent = content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            codeBlocks.push(`<div class="mermaid">${escapedContent}</div>`);
            return `!!CB_${codeBlocks.length - 1}!!`;
        });
        html = html.replace(/```\n?([\s\S]*?)\n?```/gim, (match, content) => {
            codeBlocks.push(`<pre><code>${content}</code></pre>`);
            return `!!CB_${codeBlocks.length - 1}!!`;
        });

        // 3. Escape HTML
        html = html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        // 4. Remove the reference definition lines from the output
        html = html.replace(/^\[([^\]]+)\]:\s*(https?:\/\/[^\s]+)$/gim, '');

        // 5. Icons: [icon:name]
        html = html.replace(/\[icon:([a-z0-9-]+)\]/gim, '<i data-lucide="$1" class="inline-icon"></i>');

        // 5b. Captions: [caption:Text]
        html = html.replace(/\[caption:(.*?)\]/gim, '<div class="mermaid-caption"><i>$1</i></div>');

        // 6. Horizontal Rule
        html = html.replace(/^---$/gim, '<hr>');

        // 7. Reference-style links: [text][id]
        html = html.replace(/\[([^\]]+)\]\[([^\]]+)\]/gim, (match, linkText, refId) => {
            const url = references[refId.toLowerCase()];
            return url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>` : match;
        });

        // 8. Inline links: [Linktext](https://example.com)
        html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

        // 9. Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // 10. Bold + Italic (Triple markers)
        html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<b><i>$1</i></b>');
        html = html.replace(/___(.*?)___/gim, '<b><i>$1</i></b>');

        // 11. Bold
        html = html.replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>');
        html = html.replace(/__(.*?)__/gim, '<b>$1</b>');

        // 12. Italic
        html = html.replace(/\*(.*?)\*/gim, '<i>$1</i>');
        html = html.replace(/_(.*?)_/gim, '<i>$1</i>');

        // 13. Strikethrough
        html = html.replace(/~~(.*?)~~/gim, '<s>$1</s>');

        // 14. Lists (Unordered)
        html = html.replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>');
        html = html.replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>');
        html = html.replace(/<\/ul>\s?<ul>/gim, '');

        // 15. Lists (Numbered)
        html = html.replace(/^\d+\. (.*$)/gim, '<ol><li>$1</li></ol>');
        html = html.replace(/<\/ol>\s?<ol>/gim, '');

        // 16. Line breaks
        html = html.replace(/\n/gim, '<br>');
        
        html = html.replace(/<br><ul>/gim, '<ul>');
        html = html.replace(/<\/ul><br>/gim, '</ul>');
        html = html.replace(/<br><ol>/gim, '<ol>');
        html = html.replace(/<\/ol><br>/gim, '</ol>');
        html = html.replace(/<br><hr>/gim, '<hr>');
        html = html.replace(/<hr><br>/gim, '<hr>');
        html = html.replace(/<\/h(\d)><br>/gim, '</h$1>');
        html = html.replace(/<\/div><br>/gim, '</div>');
        html = html.replace(/<\/pre><br>/gim, '</pre>');

        // 17. Re-insert Code Blocks
        codeBlocks.forEach((block, index) => {
            html = html.replace(`!!CB_${index}!!`, block);
        });

        return html;
    }
}
