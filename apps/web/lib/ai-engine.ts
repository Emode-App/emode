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

            // On closures: left to itself the model styles the shot — it hangs a
            // jacket open over an invented tee, because that is what product
            // photography looks like. That is wrong twice over. It shows the
            // garment in a state the shopper did not choose, and to fill the
            // opening it has to invent an underlayer, so the shopper is judging a
            // purchase partly on a shirt that does not exist. When outerwear is
            // the only item being tried on, the layers already in the photo are
            // the answer and inventing anything is the failure mode.
            const prompt = `
                You are an expert fashion stylist and AI image generator.
                Task: Virtual Try-On (VTON) for multiple items.

                Input 1: User's photo.
                Inputs 2-${productParts.length + 1}: Product images of ${category}.

                Generate a photorealistic image of the person from Input 1 wearing ALL the items from the product inputs.

                Fidelity to the person:
                - Keep their pose, body shape, face, hair, skin tone and the background exactly as in Input 1.
                - Match the lighting of Input 1 so the garments look photographed in that same room.

                Fidelity to the garment — this is what the shopper is judging:
                - Reproduce each product exactly as pictured: colour, material, pattern, hardware, proportions and length.
                - Reproduce its closure exactly as pictured. If the product image shows it zipped, buttoned, or fastened, it stays that way on the person. Never unzip, unbutton, or open a garment to make the shot look styled.
                - Do not add any garment, layer or accessory that was not provided as a product input.

                Layers that were not part of this try-on:
                - Replace only the garments the products actually occupy.
                - Whatever else the person is already wearing in Input 1 stays as it is, unchanged and in place.
                - If the products are outerwear only, the person keeps the top they are already wearing underneath. Do not invent a shirt, and do not open the outerwear in order to show one.

                Render with realistic fabric drape, folds, seams and shadow. High fidelity, 4k quality.

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

    /**
     * Generate a model wearing the merchant's product.
     *
     * The inverse of try-on: there is no photograph of a person, so the model is
     * invented and the garment is the only fixed thing in the frame. Which makes
     * garment fidelity the entire job — a merchant will put this on their own
     * product page, and a shot with the wrong buttons or a different collar is a
     * misrepresentation of what they are selling, not merely a bad picture.
     *
     * Model appearance is chosen by the merchant rather than left to the model.
     * Left unsaid, image models default to a narrow set of bodies and skin
     * tones. On a product whose pitch is seeing clothes on bodies that look like
     * yours, shipping that default would be its own kind of statement.
     */
    async generateModelShot(opts: {
        productImageUrl: string;
        productTitle?: string;
        /** Free-text, merchant-chosen. Empty means unspecified rather than default. */
        model?: string;
        /**
         * A described scene, on plans that allow it. Absent means the default: a
         * white seamless studio, which is what a product page actually wants and
         * what a merchant can drop straight into a catalogue.
         */
        scene?: string;
    }): Promise<GenerationResult> {
        if (!this.model) {
            throw new Error("AI Engine not initialized. Missing GOOGLE_API_KEY.");
        }

        const startTime = Date.now();
        const productPart = await this.urlToGenerativePart(opts.productImageUrl);

        const scene = opts.scene?.trim();

        // Default is deliberately not "a nice photo". A product page wants a
        // white seamless and a standard catalogue pose, because that is what
        // sits consistently beside the rest of a merchant's imagery. Anything
        // more interesting is a choice they should make on purpose.
        const sceneDirection = scene
            ? `Setting: ${scene}. Light the garment clearly within it; the scene must not overpower the product.`
            : `Setting: a plain white seamless studio background, evenly lit, with a soft natural shadow beneath the model. No props, no furniture, no set dressing.`;

        const poseDirection = scene
            ? `Pose the model naturally for that setting, full length and clearly showing the garment.`
            : `Standard catalogue pose: standing, full length, facing the camera square on, weight settled, arms relaxed at the sides, feet roughly shoulder width. Neutral expression. Shot at eye level on a portrait lens.`;

        const prompt = `
            You are a fashion photographer producing a product image for a brand's own store.

            Input 1: a photograph of a single garment, laid flat or cut out.

            Produce one photorealistic image of a human model wearing that garment.

            THE GARMENT IS THE SUBJECT and must be reproduced EXACTLY as photographed:
            same colour, same fabric and weave, same pattern and its placement, same
            buttons, zips and hardware, same collar, same cuffs, same length and cut. Do
            not restyle it, tidy it, or adjust its proportions to flatter the model. If
            it is shown fastened, it stays fastened. A shopper will buy this garment
            expecting exactly what is in this picture.

            The model: ${opts.model?.trim() || 'an adult of any appearance, naturally proportioned'}.
            ${poseDirection}

            ${sceneDirection}

            Photorealism is the requirement, not a style. This must read as a photograph
            taken with a camera, not as a render or an illustration:
            - Skin with real texture and tone variation, not smoothed or waxy.
            - Hair with individual strands catching light, not a solid mass.
            - Fabric that hangs under its own weight, with the creases and folds that
              weight actually produces, and visible weave or knit at close range.
            - Light that is physically consistent: one dominant source, shadows falling
              the same way on the model, the garment and the ground.
            - Natural depth of field and the slight imperfection of a real lens.

            Add nothing that was not supplied. No extra garments, no accessories, no
            bags, no jewellery, no logos or text of any kind. Where the outfit would
            otherwise be incomplete, use plain unbranded basics in a neutral tone and
            keep them visually quiet.

            Anatomy must be correct: five fingers per hand, natural joints, both feet on
            the ground, symmetric eyes.

            Return ONLY the image.
        `;

        let resultUrl = '';
        try {
            const result = await this.model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }, productPart] }],
                generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as any,
            });

            for (const part of result.response.candidates?.[0]?.content?.parts || []) {
                if (part?.inlineData?.data) {
                    resultUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    break;
                }
            }
        } catch (err: any) {
            console.error("[Nano Banana Pro] Model shot threw:", err.message);
            throw new Error(`Model shot failed: ${err.message}`);
        }

        if (!resultUrl) throw new Error('Model shot failed: model returned no image.');

        return {
            resultUrl,
            processingTimeMs: Date.now() - startTime,
            metadata: { categoryDetected: opts.productTitle || 'product', confidence: 0.99 },
        };
    }
}

export const aiEngine = new AIEngine();
