/**
 * Nano Banana Pro: Core AI Engine
 * This service handles the business logic for virtual try-on generations using Google Gemini.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";


/**
 * Is this address inside the network we are running on?
 *
 * Covers the ranges an SSRF actually aims at: loopback, RFC1918, link-local
 * (which is where cloud metadata services live), carrier-grade NAT, and the
 * IPv6 equivalents including IPv4-mapped forms like ::ffff:169.254.169.254.
 */
function isPrivateAddress(ip: string): boolean {
    const v = isIP(ip);

    if (v === 4) {
        const [a, b] = ip.split('.').map(Number);
        if (a === 10 || a === 127 || a === 0) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
        if (a === 192 && b === 168) return true;
        if (a === 169 && b === 254) return true;   // link-local, cloud metadata
        if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
        if (a >= 224) return true;                  // multicast and reserved
        return false;
    }

    if (v === 6) {
        const ip6 = ip.toLowerCase();
        // IPv4 written inside IPv6 is still IPv4.
        const mapped = ip6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
        if (mapped) return isPrivateAddress(mapped[1]);
        if (ip6 === '::1' || ip6 === '::') return true;
        if (/^f[cd]/.test(ip6)) return true;        // unique local
        if (/^fe[89ab]/.test(ip6)) return true;     // link-local
        return false;
    }

    // Unparseable is not provably public.
    return true;
}

/**
 * Resolve a caller-supplied image URL and refuse anything that points inward.
 *
 * productImages arrives straight from the request body, and this function
 * fetches it server-side. Without this, a caller could aim it at internal hosts
 * and use the thrown status code as an oracle to map the network from outside.
 *
 * DNS is resolved here rather than trusting the hostname, because
 * "internal.example.com" resolving to 10.0.0.5 looks perfectly public as a
 * string. This does not close a determined DNS-rebinding attack, where the name
 * resolves differently between this check and the fetch, but it removes the
 * straightforward version entirely.
 */
async function assertFetchableUrl(raw: string): Promise<void> {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        throw new Error('That image address could not be read.');
    }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error('Only http and https image addresses are supported.');
    }

    const host = url.hostname.replace(/^\[|\]$/g, '');

    // A literal IP needs no lookup, and must not get one.
    if (isIP(host)) {
        if (isPrivateAddress(host)) throw new Error('That image address is not reachable.');
        return;
    }

    try {
        const { address } = await lookup(host);
        if (isPrivateAddress(address)) throw new Error('That image address is not reachable.');
    } catch (err: any) {
        if (err?.message === 'That image address is not reachable.') throw err;
        throw new Error('That image address could not be resolved.');
    }
}

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
                'That product image address is not usable. It must start with http:// or https://.'
            );
        }

        // Refuse anything pointing at our own network before touching it.
        await assertFetchableUrl(url);

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
            // Deliberately vague to the caller. Returning the upstream status
            // and URL turns a blind server-side fetch into a port scanner with a
            // readable result. The detail goes to our logs instead.
            if (!response.ok) {
                console.error('[Nano Banana Pro] Upstream image fetch failed:', response.status, url.substring(0, 120));
                throw new Error('That product image could not be loaded.');
            }
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
            // Same reasoning: the caller learns that it failed, not what failed.
            throw new Error(error?.message?.startsWith('That image address')
                ? error.message
                : 'That product image could not be loaded.');
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

            // On mirroring: image models treat a horizontal flip as the same
            // image, because flipping is a standard training augmentation. So an
            // asymmetric garment comes back reversed, and nothing about the
            // result looks broken enough to notice — until the garment is one
            // denim leg and one leather leg, and the shopper is comparing it to
            // the product page. Symmetric clothing hid this completely.
            //
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
                - Never mirror the garment. If a detail sits on one side of the product image, it sits on that same side of the person as the viewer sees it. This applies to contrast panels, a single differently coloured leg or sleeve, stripes, slits, zips, logos, pockets and any print placed off centre. A mirrored garment is a different garment to the shopper looking at the product page.
                - Where a garment changes material or colour partway along, keep the transition at the same point on the body as in the product image, at the same angle, with the same edge. A raw or frayed edge stays raw and frayed.
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
         * A previously generated shot whose model should be reused. Brand
         * consistency is why a lookbook books one model for a season, and it is
         * the thing a described model cannot give you — the same words produce a
         * different face every time.
         */
        houseModelUrl?: string;
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
        const housePart = opts.houseModelUrl
            ? await this.urlToGenerativePart(opts.houseModelUrl)
            : null;

        const scene = opts.scene?.trim();

        // Default is deliberately not "a nice photo". A product page wants a
        // white seamless and a standard catalogue pose, because that is what
        // sits consistently beside the rest of a merchant's imagery. Anything
        // more interesting is a choice they should make on purpose.
        const sceneDirection = scene
            ? `Setting: ${scene}. Light the garment clearly within it; the scene must not overpower the product.`
            : `Setting: a plain white seamless studio background, evenly lit, with a soft natural shadow beneath the model. No props, no furniture, no set dressing.`;

        const poseDirection = scene
            ? `Pose the model naturally for that setting. Full-length framing: the entire body from the top of the head to the shoes is inside the frame.`
            : `Standard catalogue pose: standing, facing the camera square on, weight settled, arms relaxed at the sides, feet roughly shoulder width apart. Neutral expression.`;

        const prompt = `
            You are a fashion photographer producing a product image for a brand's own store.

            Input 1: a photograph of a single garment, laid flat or cut out.
            ${housePart ? 'Input 2: a photograph of the model to use.' : ''}

            Produce one photorealistic image of a human model wearing that garment.

            ${housePart
                ? `THE MODEL IS GIVEN. Use the person in Input 2 — the same face, the same hair, the same body, the same skin tone. This is one model photographed on a second occasion wearing a different garment, not a similar-looking person. Their identity must be recognisably consistent; only the clothing and the pose change.`
                : ''}

            THE GARMENT IS THE SUBJECT and must be reproduced EXACTLY as photographed:
            same colour, same fabric and weave, same pattern and its placement, same
            buttons, zips and hardware, same collar, same cuffs, same length and cut. Do
            not restyle it, tidy it, or adjust its proportions to flatter the model. If
            it is shown fastened, it stays fastened. A shopper will buy this garment
            expecting exactly what is in this picture.

            ${housePart
                ? poseDirection
                : `The model: ${opts.model?.trim() || 'an adult of any appearance, naturally proportioned'}.
            ${poseDirection}`}

            ${sceneDirection}

            FRAMING. Full-length, head to toe. The entire body must be inside the frame,
            from the top of the head down to the shoes, with clear space above and below.
            Do not crop at the knees, the waist, the chest or the shoulders. This is a
            full-body product shot, not a portrait and not a close-up on the garment.
            Camera at roughly chest height and far enough back that the whole figure
            fits without distortion.

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
                contents: [{
                    role: "user",
                    parts: housePart
                        ? [{ text: prompt }, productPart, housePart]
                        : [{ text: prompt }, productPart],
                }],
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
