/**
 * Stable Diffusion Service
 *
 * Integrates with AUTOMATIC1111 Stable Diffusion Web UI API
 * Supports text-to-image, image-to-image, and model management
 */

import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";

export interface GeneratedImage {
  id: string;
  chatId: string;
  messageId: string;
  type: "txt2img" | "img2img";
  prompt: string;
  negativePrompt?: string;
  inputImagePath?: string;
  outputPath: string;
  url: string;
  parameters: ImageParameters;
  metadata: ImageMetadata;
  timestamp: string;
}

export interface ImageParameters {
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  seed: number;
  sampler: string;
  model: string;
  denoisingStrength?: number;
}

export interface ImageMetadata {
  fileSize: number;
  format: "png" | "jpg" | "webp";
  generationTime: number;
  hash?: string;
  embeddings?: string[];
}

export interface Txt2ImgRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  sampler?: string;
  batchSize?: number;
}

export interface Img2ImgRequest {
  prompt: string;
  initImages: string[];
  negativePrompt?: string;
  denoisingStrength?: number;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  sampler?: string;
}

export interface SDModel {
  title: string;
  model_name: string;
  hash: string;
  sha256: string;
  filename: string;
  config: string;
}

export class StableDiffusionService {
  private apiUrl: string;
  private timeout: number;
  private available: boolean = false;

  constructor() {
    this.apiUrl = process.env.SD_API_URL || "http://localhost:7860";
    this.timeout = parseInt(process.env.SD_TIMEOUT || "120000");
    this.checkAvailability();
  }

  /**
   * Check if Stable Diffusion Web UI is available
   */
  private async checkAvailability(): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/sd-models`, {
        signal: AbortSignal.timeout(5000),
      });
      this.available = response.ok;
    } catch (error) {
      console.warn("Stable Diffusion Web UI not available:", error);
      this.available = false;
    }
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.available;
  }

  /**
   * Generate image from text (txt2img)
   */
  async generateImage(
    chatId: string,
    messageId: string,
    request: Txt2ImgRequest,
  ): Promise<GeneratedImage> {
    if (!this.available) {
      throw new Error("Stable Diffusion service not available");
    }

    const startTime = Date.now();
    const seed = request.seed || Math.floor(Math.random() * 2147483647);

    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/txt2img`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: request.prompt,
          negative_prompt: request.negativePrompt || "",
          width: request.width || 512,
          height: request.height || 512,
          steps: request.steps || 30,
          cfg_scale: request.cfgScale || 7.5,
          seed: seed,
          sampler_name: request.sampler || "DPM++ 2M Karras",
          batch_size: request.batchSize || 1,
          n_iter: 1,
          save_images: true,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`SD API error: ${response.statusText}`);
      }

      const data = await response.json();
      const generationTime = Date.now() - startTime;

      // Save image to chat artifacts
      const imageId = `img-${Date.now()}`;
      const imagePath = await this.saveImage(chatId, imageId, data.images[0]);

      const result: GeneratedImage = {
        id: imageId,
        chatId,
        messageId,
        type: "txt2img",
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        outputPath: imagePath,
        url: `/api/images/${chatId}/${imageId}.png`,
        parameters: {
          width: request.width || 512,
          height: request.height || 512,
          steps: request.steps || 30,
          cfgScale: request.cfgScale || 7.5,
          seed: seed,
          sampler: request.sampler || "DPM++ 2M Karras",
          model: await this.getCurrentModel(),
        },
        metadata: {
          fileSize: 0, // Will be updated after saving
          format: "png",
          generationTime,
        },
        timestamp: new Date().toISOString(),
      };

      // Update file size
      const stats = await fs.stat(path.join(process.cwd(), imagePath));
      result.metadata.fileSize = stats.size;

      // Save metadata
      await this.saveImageMetadata(chatId, imageId, result);

      return result;
    } catch (error) {
      console.error("Failed to generate image:", error);
      throw error;
    }
  }

  /**
   * Generate image from image (img2img)
   */
  async generateImageFromImage(
    chatId: string,
    messageId: string,
    request: Img2ImgRequest,
  ): Promise<GeneratedImage> {
    if (!this.available) {
      throw new Error("Stable Diffusion service not available");
    }

    const startTime = Date.now();
    const seed = request.seed || Math.floor(Math.random() * 2147483647);

    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/img2img`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          init_images: request.initImages,
          prompt: request.prompt,
          negative_prompt: request.negativePrompt || "",
          denoising_strength: request.denoisingStrength || 0.75,
          width: request.width || 512,
          height: request.height || 512,
          steps: request.steps || 30,
          cfg_scale: request.cfgScale || 7.5,
          seed: seed,
          sampler_name: request.sampler || "DPM++ 2M Karras",
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`SD API error: ${response.statusText}`);
      }

      const data = await response.json();
      const generationTime = Date.now() - startTime;

      // Save image
      const imageId = `img-${Date.now()}`;
      const imagePath = await this.saveImage(chatId, imageId, data.images[0]);

      const result: GeneratedImage = {
        id: imageId,
        chatId,
        messageId,
        type: "img2img",
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        outputPath: imagePath,
        url: `/api/images/${chatId}/${imageId}.png`,
        parameters: {
          width: request.width || 512,
          height: request.height || 512,
          steps: request.steps || 30,
          cfgScale: request.cfgScale || 7.5,
          seed: seed,
          sampler: request.sampler || "DPM++ 2M Karras",
          model: await this.getCurrentModel(),
          denoisingStrength: request.denoisingStrength || 0.75,
        },
        metadata: {
          fileSize: 0,
          format: "png",
          generationTime,
        },
        timestamp: new Date().toISOString(),
      };

      // Update file size
      const stats = await fs.stat(path.join(process.cwd(), result.outputPath));
      result.metadata.fileSize = stats.size;

      // Save metadata
      await this.saveImageMetadata(chatId, imageId, result);

      return result;
    } catch (error) {
      console.error("Failed to generate image from image:", error);
      throw error;
    }
  }

  /**
   * Get list of available models
   */
  async getModels(): Promise<SDModel[]> {
    if (!this.available) {
      return [];
    }

    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/sd-models`);
      if (!response.ok) {
        throw new Error(`Failed to get models: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to get SD models:", error);
      return [];
    }
  }

  /**
   * Get current model
   */
  async getCurrentModel(): Promise<string> {
    if (!this.available) {
      return "unknown";
    }

    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/options`);
      if (!response.ok) {
        throw new Error(`Failed to get options: ${response.statusText}`);
      }
      const options = await response.json();
      return options.sd_model_checkpoint || "unknown";
    } catch (error) {
      console.error("Failed to get current model:", error);
      return "unknown";
    }
  }

  /**
   * Set current model
   */
  async setModel(modelName: string): Promise<boolean> {
    if (!this.available) {
      return false;
    }

    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sd_model_checkpoint: modelName,
        }),
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to set model:", error);
      return false;
    }
  }

  /**
   * Get available samplers
   */
  async getSamplers(): Promise<string[]> {
    if (!this.available) {
      return [];
    }

    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/samplers`);
      if (!response.ok) {
        throw new Error(`Failed to get samplers: ${response.statusText}`);
      }
      const samplers = await response.json();
      return samplers.map((s: any) => s.name);
    } catch (error) {
      console.error("Failed to get samplers:", error);
      return [];
    }
  }

  // Private helper methods

  private async saveImage(
    chatId: string,
    imageId: string,
    base64Image: string,
  ): Promise<string> {
    const chatDir = path.join(
      process.cwd(),
      "context_storage",
      `chat_${chatId}`,
    );
    const imagesDir = path.join(chatDir, "artifacts", "images");

    await fs.mkdir(imagesDir, { recursive: true });

    const imagePath = path.join(imagesDir, `${imageId}.png`);
    const imageBuffer = Buffer.from(base64Image, "base64");

    await fs.writeFile(imagePath, imageBuffer);

    // Return relative path
    return path.join(
      "context_storage",
      `chat_${chatId}`,
      "artifacts",
      "images",
      `${imageId}.png`,
    );
  }

  private async saveImageMetadata(
    chatId: string,
    imageId: string,
    metadata: GeneratedImage,
  ): Promise<void> {
    const chatDir = path.join(
      process.cwd(),
      "context_storage",
      `chat_${chatId}`,
    );
    const imagesDir = path.join(chatDir, "artifacts", "images");
    const metadataPath = path.join(imagesDir, `${imageId}.json`);

    await fs.writeFile(
      metadataPath,
      JSON.stringify(metadata, null, 2),
      "utf-8",
    );
  }

  /**
   * Get image metadata
   */
  async getImageMetadata(
    chatId: string,
    imageId: string,
  ): Promise<GeneratedImage | null> {
    try {
      const chatDir = path.join(
        process.cwd(),
        "context_storage",
        `chat_${chatId}`,
      );
      const imagesDir = path.join(chatDir, "artifacts", "images");
      const metadataPath = path.join(imagesDir, `${imageId}.json`);

      const content = await fs.readFile(metadataPath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * List all images for a chat
   */
  async listImages(chatId: string): Promise<GeneratedImage[]> {
    try {
      const chatDir = path.join(
        process.cwd(),
        "context_storage",
        `chat_${chatId}`,
      );
      const imagesDir = path.join(chatDir, "artifacts", "images");

      const files = await fs.readdir(imagesDir);
      const metadataFiles = files.filter((f) => f.endsWith(".json"));

      const images: GeneratedImage[] = [];
      for (const file of metadataFiles) {
        const content = await fs.readFile(path.join(imagesDir, file), "utf-8");
        images.push(JSON.parse(content));
      }

      return images.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    } catch (error) {
      return [];
    }
  }

  /**
   * Delete image
   */
  async deleteImage(chatId: string, imageId: string): Promise<boolean> {
    try {
      const chatDir = path.join(
        process.cwd(),
        "context_storage",
        `chat_${chatId}`,
      );
      const imagesDir = path.join(chatDir, "artifacts", "images");

      await fs.unlink(path.join(imagesDir, `${imageId}.png`));
      await fs.unlink(path.join(imagesDir, `${imageId}.json`));

      return true;
    } catch (error) {
      console.error("Failed to delete image:", error);
      return false;
    }
  }

  /**
   * Interrupt ongoing generation
   */
  async interrupt(): Promise<boolean> {
    if (!this.available) {
      return false;
    }

    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/interrupt`, {
        method: "POST",
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to interrupt generation:", error);
      return false;
    }
  }

  /**
   * Get generation progress
   */
  async getProgress(): Promise<{
    progress: number;
    eta: number;
    state: any;
  } | null> {
    if (!this.available) {
      return null;
    }

    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/progress`);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      return null;
    }
  }
}
