/**
 * Preview Service
 *
 * Handles rendering previews for code, HTML, markdown, and other content types
 * Provides sandboxed execution and safe rendering
 */

import { marked } from "marked";

export interface PreviewConfig {
  type: "html" | "markdown" | "code" | "image" | "json";
  content: string;
  language?: string;
  sandbox: boolean;
  theme: "light" | "dark";
  options: PreviewOptions;
}

export interface PreviewOptions {
  enableScripts?: boolean;
  enableStyles?: boolean;
  maxHeight?: number;
  lineNumbers?: boolean;
  wordWrap?: boolean;
}

export interface PreviewResult {
  id: string;
  rendered: string;
  mimeType: string;
  size: number;
  timestamp: string;
  errors?: PreviewError[];
}

export interface PreviewError {
  line?: number;
  column?: number;
  message: string;
  severity: "error" | "warning";
}

export class PreviewService {
  /**
   * Render content based on type
   */
  async render(config: PreviewConfig): Promise<PreviewResult> {
    const startTime = Date.now();

    let rendered: string;
    let mimeType: string;
    const errors: PreviewError[] = [];

    try {
      switch (config.type) {
        case "html":
          rendered = this.renderHTML(config);
          mimeType = "text/html";
          break;

        case "markdown":
          rendered = await this.renderMarkdown(config);
          mimeType = "text/html";
          break;

        case "code":
          rendered = this.renderCode(config);
          mimeType = "text/html";
          break;

        case "json":
          rendered = this.renderJSON(config);
          mimeType = "text/html";
          break;

        case "image":
          rendered = this.renderImage(config);
          mimeType = "text/html";
          break;

        default:
          throw new Error(`Unsupported preview type: ${config.type}`);
      }
    } catch (error) {
      errors.push({
        message: String(error),
        severity: "error",
      });
      rendered = this.renderError(error);
      mimeType = "text/html";
    }

    const result: PreviewResult = {
      id: `preview-${Date.now()}`,
      rendered,
      mimeType,
      size: new Blob([rendered]).size,
      timestamp: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined,
    };

    return result;
  }

  /**
   * Render HTML with optional sandboxing
   */
  private renderHTML(config: PreviewConfig): string {
    let html = config.content;

    if (config.sandbox) {
      // Wrap in sandboxed iframe structure
      html = this.wrapInSandbox(html, {
        allowScripts: config.options.enableScripts || false,
        allowStyles: config.options.enableStyles !== false,
      });
    }

    return html;
  }

  /**
   * Render Markdown to HTML
   */
  private async renderMarkdown(config: PreviewConfig): Promise<string> {
    try {
      const html = await marked.parse(config.content);

      return this.wrapInDocument(html, {
        title: "Markdown Preview",
        theme: config.theme,
        styles: this.getMarkdownStyles(config.theme),
      });
    } catch (error) {
      throw new Error(`Markdown render error: ${error}`);
    }
  }

  /**
   * Render code with syntax highlighting
   */
  private renderCode(config: PreviewConfig): string {
    const language = config.language || "plaintext";
    const escapedCode = this.escapeHTML(config.content);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Preview</title>
  <style>
    ${this.getCodeStyles(config.theme)}
  </style>
</head>
<body class="${config.theme}">
  <div class="code-container">
    <div class="code-header">
      <span class="language-badge">${language}</span>
      <button class="copy-btn" onclick="copyCode()">Copy</button>
    </div>
    <pre class="${config.options.lineNumbers ? "line-numbers" : ""}"><code class="language-${language}">${escapedCode}</code></pre>
  </div>
  <script>
    function copyCode() {
      const code = document.querySelector('code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 2000);
      });
    }
  </script>
</body>
</html>
    `;

    return html;
  }

  /**
   * Render JSON with formatting
   */
  private renderJSON(config: PreviewConfig): string {
    try {
      const parsed = JSON.parse(config.content);
      const formatted = JSON.stringify(parsed, null, 2);
      const highlighted = this.highlightJSON(formatted);

      return this.wrapInDocument(highlighted, {
        title: "JSON Preview",
        theme: config.theme,
        styles: this.getJSONStyles(config.theme),
      });
    } catch (error) {
      throw new Error(`Invalid JSON: ${error}`);
    }
  }

  /**
   * Render image preview
   */
  private renderImage(config: PreviewConfig): string {
    // Assume content is a URL or base64 data
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image Preview</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: ${config.theme === "dark" ? "#1e1e1e" : "#f5f5f5"};
    }
    img {
      max-width: 100%;
      max-height: 90vh;
      object-fit: contain;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <img src="${config.content}" alt="Preview" />
</body>
</html>
    `;

    return html;
  }

  /**
   * Wrap content in sandboxed iframe structure
   */
  private wrapInSandbox(
    content: string,
    options: { allowScripts: boolean; allowStyles: boolean },
  ): string {
    const sandbox = [];
    if (options.allowScripts) {
      sandbox.push("allow-scripts");
    }
    sandbox.push("allow-same-origin"); // Needed for styling

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sandboxed Preview</title>
  <style>
    body { margin: 0; padding: 0; }
    iframe {
      width: 100%;
      height: 100vh;
      border: none;
    }
  </style>
</head>
<body>
  <iframe
    sandbox="${sandbox.join(" ")}"
    srcdoc="${this.escapeHTML(content)}"
  ></iframe>
</body>
</html>
    `;
  }

  /**
   * Wrap content in full HTML document
   */
  private wrapInDocument(
    content: string,
    options: { title: string; theme: string; styles?: string },
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    ${options.styles || this.getDefaultStyles(options.theme)}
  </style>
</head>
<body class="${options.theme}">
  <div class="content">
    ${content}
  </div>
</body>
</html>
    `;
  }

  /**
   * Render error message
   */
  private renderError(error: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Preview Error</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 20px;
      background: #1e1e1e;
      color: #e74c3c;
    }
    .error-container {
      background: #2d2d2d;
      border: 1px solid #e74c3c;
      border-radius: 8px;
      padding: 20px;
    }
    h1 { margin-top: 0; }
    pre {
      background: #1e1e1e;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>Preview Error</h1>
    <pre>${this.escapeHTML(String(error))}</pre>
  </div>
</body>
</html>
    `;
  }

  // Style generators

  private getDefaultStyles(theme: string): string {
    const isDark = theme === "dark";
    return `
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 20px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1.6;
        background: ${isDark ? "#1e1e1e" : "#ffffff"};
        color: ${isDark ? "#d4d4d4" : "#333333"};
      }
      .content {
        max-width: 900px;
        margin: 0 auto;
      }
    `;
  }

  private getMarkdownStyles(theme: string): string {
    const isDark = theme === "dark";
    return `
      ${this.getDefaultStyles(theme)}
      h1, h2, h3, h4, h5, h6 {
        margin-top: 24px;
        margin-bottom: 16px;
        font-weight: 600;
        line-height: 1.25;
      }
      h1 { font-size: 2em; border-bottom: 1px solid ${isDark ? "#444" : "#eee"}; padding-bottom: 8px; }
      h2 { font-size: 1.5em; border-bottom: 1px solid ${isDark ? "#444" : "#eee"}; padding-bottom: 8px; }
      code {
        background: ${isDark ? "#2d2d2d" : "#f6f8fa"};
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.9em;
      }
      pre {
        background: ${isDark ? "#2d2d2d" : "#f6f8fa"};
        padding: 16px;
        border-radius: 6px;
        overflow-x: auto;
      }
      pre code {
        background: none;
        padding: 0;
      }
      blockquote {
        border-left: 4px solid ${isDark ? "#555" : "#ddd"};
        padding-left: 16px;
        margin-left: 0;
        color: ${isDark ? "#999" : "#666"};
      }
      a {
        color: ${isDark ? "#58a6ff" : "#0969da"};
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 16px 0;
      }
      th, td {
        border: 1px solid ${isDark ? "#444" : "#ddd"};
        padding: 8px 12px;
        text-align: left;
      }
      th {
        background: ${isDark ? "#2d2d2d" : "#f6f8fa"};
        font-weight: 600;
      }
    `;
  }

  private getCodeStyles(theme: string): string {
    const isDark = theme === "dark";
    return `
      body {
        margin: 0;
        padding: 0;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        background: ${isDark ? "#1e1e1e" : "#ffffff"};
        color: ${isDark ? "#d4d4d4" : "#333333"};
      }
      .code-container {
        height: 100vh;
        display: flex;
        flex-direction: column;
      }
      .code-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 16px;
        background: ${isDark ? "#2d2d2d" : "#f6f8fa"};
        border-bottom: 1px solid ${isDark ? "#444" : "#ddd"};
      }
      .language-badge {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        color: ${isDark ? "#858585" : "#666"};
      }
      .copy-btn {
        padding: 4px 12px;
        font-size: 12px;
        border: 1px solid ${isDark ? "#444" : "#ddd"};
        background: ${isDark ? "#3d3d3d" : "#ffffff"};
        color: ${isDark ? "#d4d4d4" : "#333"};
        border-radius: 4px;
        cursor: pointer;
      }
      .copy-btn:hover {
        background: ${isDark ? "#4d4d4d" : "#f0f0f0"};
      }
      pre {
        flex: 1;
        margin: 0;
        padding: 16px;
        overflow: auto;
        background: ${isDark ? "#1e1e1e" : "#ffffff"};
      }
      code {
        font-size: 14px;
        line-height: 1.5;
      }
    `;
  }

  private getJSONStyles(theme: string): string {
    const isDark = theme === "dark";
    return `
      ${this.getCodeStyles(theme)}
      .json-key { color: ${isDark ? "#9cdcfe" : "#0451a5"}; }
      .json-string { color: ${isDark ? "#ce9178" : "#a31515"}; }
      .json-number { color: ${isDark ? "#b5cea8" : "#09885a"}; }
      .json-boolean { color: ${isDark ? "#569cd6" : "#0000ff"}; }
      .json-null { color: ${isDark ? "#808080" : "#808080"}; }
    `;
  }

  // Utility methods

  private escapeHTML(text: string): string {
    const div = { textContent: text };
    const temp = document.createElement("div");
    temp.textContent = text;
    return temp.innerHTML;
  }

  private highlightJSON(json: string): string {
    return json
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
      .replace(/"([^"]+)"/g, '<span class="json-string">"$1"</span>')
      .replace(/\b(\d+)\b/g, '<span class="json-number">$1</span>')
      .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
      .replace(/\bnull\b/g, '<span class="json-null">null</span>');
  }

  /**
   * Extract code blocks from markdown/chat content
   */
  extractCodeBlocks(content: string): Array<{
    language: string;
    code: string;
    startLine: number;
  }> {
    const blocks: Array<{ language: string; code: string; startLine: number }> =
      [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;

    let match;
    let lineNumber = 1;

    while ((match = regex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || "plaintext",
        code: match[2].trim(),
        startLine: lineNumber,
      });

      lineNumber += (match[0].match(/\n/g) || []).length;
    }

    return blocks;
  }
}
