/**
 * テキスト処理に関するユーティリティクラス
 */
export class TextFormatter {
    private static indentLevel = 0;
    private static readonly INDENT_STRING = '  ';

    /**
     * インデントレベルの設定
     */
    public static setIndentLevel(level: number): void {
        this.indentLevel = Math.max(0, level);
    }

    /**
     * 現在のインデントを取得
     */
    public static getCurrentIndent(): string {
        return this.INDENT_STRING.repeat(this.indentLevel);
    }

    /**
     * テキストの整形を行う
     */
    public static format(text: string): string {
        return text
            .split(/\n\s*\n+/)
            .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
            .filter(paragraph => paragraph.length > 0)
            .join('\n\n')
            .replace(/\[画像\(([^)]+)\)\]/g, '\n[画像($1)]\n')
            .replace(/\[動画\(([^)]+)\)\]/g, '\n[動画($1)]\n')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[$1]($2)')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^\n+|\n+$/g, '')
            .split('\n')
            .map(line => this.getCurrentIndent() + line.trim())
            .filter(line => line.trim().length > 0)
            .join('\n');
    }

    /**
     * 見出しの整形を行う
     */
    public static formatHeading(level: number, text: string): string {
        return `${'#'.repeat(level)} ${text}\n\n`;
    }

    /**
     * リンクの整形を行う
     */
    public static formatLink(text: string, href: string): string {
        return `[${text}](${href}) `;
    }

    /**
     * リストアイテムの整形を行う
     */
    public static formatListItem(text: string): string {
        return `- ${text}`;
    }

    /**
     * 画像の整形を行う
     */
    public static formatImage(src: string): string {
        return `[画像(${src})] `;
    }

    /**
     * 動画の整形を行う
     */
    public static formatVideo(src: string): string {
        return `[動画(${src})] `;
    }

    /**
     * 段落の整形を行う
     */
    public static formatParagraph(text: string): string {
        return `${text}\n\n`;
    }

    /**
     * テキストノードの整形を行う
     */
    public static formatTextNode(text: string): string {
        return text.trim() ? text.replace(/\s+/g, ' ') + ' ' : '';
    }

    /**
     * 構造化されたコンテンツの生成
     */
    public static generateStructuredContent(title: string, description: string, content: string): string {
        return [
            title ? `# ${title}` : '# No Title',
            description ? `\n## Description\n${description}` : '',
            '\n## Content',
            content
        ].filter(Boolean).join('\n');
    }
}