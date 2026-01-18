import fs from "fs/promises";
import path from "path";

export class FileManager {
  async readProjectStructure(projectPath: string): Promise<any> {
    try {
      const structure = await this.buildStructure(projectPath);
      return structure;
    } catch (error) {
      console.error("Failed to read project structure:", error);
      throw error;
    }
  }

  private async buildStructure(
    dirPath: string,
    depth: number = 0,
    maxDepth: number = 3,
  ): Promise<any> {
    if (depth > maxDepth) return null;

    const stats = await fs.stat(dirPath);
    const name = path.basename(dirPath);

    // Skip node_modules and other common directories
    const skipDirs = [
      "node_modules",
      ".git",
      "dist",
      "build",
      ".next",
      "coverage",
    ];
    if (skipDirs.includes(name)) return null;

    if (stats.isFile()) {
      return {
        type: "file",
        name,
        path: dirPath,
        size: stats.size,
      };
    }

    if (stats.isDirectory()) {
      const children = await fs.readdir(dirPath);
      const childStructures = await Promise.all(
        children.map((child) =>
          this.buildStructure(path.join(dirPath, child), depth + 1, maxDepth),
        ),
      );

      return {
        type: "directory",
        name,
        path: dirPath,
        children: childStructures.filter(Boolean),
      };
    }

    return null;
  }

  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch (error) {
      console.error("Failed to read file:", error);
      throw error;
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, "utf-8");
    } catch (error) {
      console.error("Failed to write file:", error);
      throw error;
    }
  }

  async createDiff(oldContent: string, newContent: string): Promise<string> {
    // Simple diff implementation
    const oldLines = oldContent.split("\n");
    const newLines = newContent.split("\n");

    let diff = "";
    const maxLines = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || "";
      const newLine = newLines[i] || "";

      if (oldLine !== newLine) {
        if (oldLine) diff += `- ${oldLine}\n`;
        if (newLine) diff += `+ ${newLine}\n`;
      } else {
        diff += `  ${oldLine}\n`;
      }
    }

    return diff;
  }

  async applyChanges(
    changes: Array<{ filePath: string; content: string }>,
  ): Promise<void> {
    for (const change of changes) {
      await this.writeFile(change.filePath, change.content);
    }
  }
}
