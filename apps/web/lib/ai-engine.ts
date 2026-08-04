/**
 * Nano Banana Pro: Core AI Engine
 * This service handles the business logic for virtual try-on generations using Google Gemini.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GenerationRequest {
    userImage: string; // Base64 data URL or standard URL
    productImages: string[]; // Array of product image URLs
    category?: string;
    bodyMetadata?: {
        height?: string;
        weight?: string;
        fitPreference?: 'loose' | 'regular' | 'slim';
    };
}

export interface GenerationResult {
    resultUrl: string;
    processingTimeMs: number;
    metadata: {
        categoryDetected: string;
        confidence: number;
    };
}

class AIEngine {
    private genAI: GoogleGenerativeAI | null = null;
    private model: any = null;

    constructor() {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-3-pro-image-preview" });
        } else {
            console.warn("[Nano Banana Pro] GOOGLE_API_KEY not found. AI features will fail if called.");
        }
    }

    /**
     * Helper to fetch a URL and return a GoogleGenerativeAI Part object found in "inlineData".
     */
    private async urlToGenerativePart(url: string, mimeType: string = "image/jpeg"): Promise<{ inlineData: { data: string; mimeType: string } }> {
        // If it's already a data URL, strip the header
        if (url.startsWith('data:')) {
            const matches = url.match(/^data:(.+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                return {
                    inlineData: {
                        mimeType: matches[1],
                        data: matches[2]
                    }
                };
            }
        }

        // Shopify's `image_url` Liquid filter emits protocol-relative URLs
        // ("//shop.myshopify.com/cdn/..."). A browser resolves those against the
        // page, so the product thumbnail renders correctly and nothing looks
        // wrong — but Node's fetch has no base URL to resolve against and fails
        // with "Failed to parse URL". Normalize before fetching so every caller
        // (theme extension, widget, extension) is covered.
        if (url.startsWith('//')) {
            url = `https:${url}`;
        }

        if (!/^https?:\/\//i.test(url)) {
            throw new Error(
                `Product image URL is not absolute (${url.substring(0, 80)}). ` +
                `It must start with http:// or https://.`
            );
        }

        // Otherwise fetch the URL
        console.log("[Nano Banana Pro] Fetching image URL:", url.substring(0, 80));
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 20000);
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NanoBananaPro/1.0)' }
            });
            clearTimeout(timeout);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText} — ${url}`);
            const arrayBuffer = await response.arrayBuffer();
            const detectedMime = response.headers.get('content-type')?.split(';')[0] || mimeType;
            console.log("[Nano Banana Pro] Fetched image OK, bytes:", arrayBuffer.byteLength, "mime:", detectedMime);
            return {
                inlineData: {
                    data: Buffer.from(arrayBuffer).toString("base64"),
                    mimeType: detectedMime
                }
            };
        } catch (error: any) {
            console.error("[Nano Banana Pro] Failed to fetch image URL:", url.substring(0, 120), "—", error.message);
            throw new Error(`Failed to process input image (${url.substring(0, 60)}...): ${error.message}`);
        }
    }

    /**
     * Triggers the virtual try-on generation via Gemini.
     */
    async generateTryOn(request: GenerationRequest): Promise<GenerationResult> {
        if (!this.model) {
            throw new Error("AI Engine not initialized. Missing GOOGLE_API_KEY.");
        }

        const startTime = Date.now();
        console.log(`[Nano Banana Pro] Processing request for ${request.productImages.length} products`);

        try {
            // 1. Prepare Inputs
            const userImagePart = await this.urlToGenerativePart(request.userImage);

            // 2. Prepare Product Images
            const productParts = await Promise.all(
                request.productImages.map(img => this.urlToGenerativePart(img))
            );

            const category = request.category || 'clothing items';

            const prompt = `
                You are an expert fashion stylist and AI image generator.
                Task: Virtual Try-On (VTON) for multiple items.
                
                Input 1: User's photo.
                Inputs 2-${productParts.length + 1}: Product images of ${category}.
                
                Generate a photorealistic image of the user from Input 1 wearing ALL the items from the product inputs.
                - Maintain the user's pose, lighting, and body shape exactly.
                - Seamlessly integrate all provided products onto the user's body as a complete outfit.
                - Ensure realistic layered fabric drape, folds, and lighting integration.
                - High fidelity, 4k quality.
                
                Return ONLY the image.
            `;

            // 2. Call Gemini — responseModalities required to get image output back
            let resultUrl = '';
            console.log("[Nano Banana Pro] Sending generation request to model...");
            let modelError: any = null;
            try {
                const result = await this.model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }, userImagePart, ...productParts] }],
                    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as any,
                });
                const response = result.response;

                console.log("[Nano Banana Pro] Raw response candidates count:", response.candidates?.length ?? 0);

                // Scan all parts — the image is not guaranteed to be in parts[0]
                if (response.candidates?.[0]?.content?.parts) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part?.inlineData?.data) {
                            resultUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                            console.log("[Nano Banana Pro] Image extracted from inlineData, mimeType:", part.inlineData.mimeType);
                            break;
                        }
                    }
                }

                if (!resultUrl) {
                    console.warn("[Nano Banana Pro] No inlineData image found in response. Parts received:",
                        response.candidates?.[0]?.content?.parts?.map((p: any) => Object.keys(p)).join(' | ') ?? 'none'
                    );
                }
            } catch (err: any) {
                modelError = err;
                console.error("[Nano Banana Pro] Model generation threw an error:", err.message, err.stack);
            }

            // No silent placeholder: a failed generation must surface as an error so
            // callers (and usage counters) never treat a stock photo as a real try-on.
            if (!resultUrl) {
                throw new Error(
                    modelError?.message
                        ? `Generation failed: ${modelError.message}`
                        : 'Generation failed: model returned no image.'
                );
            }
            console.log("[Nano Banana Pro] Generation succeeded. Returning real image (data URL length:", resultUrl.length, ")");

            const processingTimeMs = Date.now() - startTime;

            return {
                resultUrl: resultUrl,
                processingTimeMs,
                metadata: {
                    categoryDetected: category,
                    confidence: 0.99
                }
            };

        } catch (error: any) {
            console.error("[Nano Banana Pro] Generation Failed:", error);
            throw error;
        }
    }
}

export const aiEngine = new AIEngine();
