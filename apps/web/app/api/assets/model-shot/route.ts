import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiEngine } from '../../../../lib/ai-engine';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/** Plans that include asset generation, per the pricing page. */
const ASSET_PLANS = new Set(['pro', 'growth', 'lifetime_pro', 'lifetime_founder']);

/** Plans that may describe a scene rather than take the white studio default. */
const SCENE_PLANS = new Set(['growth', 'lifetime_founder']);

/**
 * Plans with the premium controls: a reusable house model, and more than one
 * take per generation.
 *
 * These gate CAPABILITY rather than convenience — more product for more money,
 * which reads as fair. Presets and free-text descriptions stay available on every
 * plan that has Studio at all, because charging for the easier path would leave
 * the cheaper plan with more control rather than less.
 */
const PREMIUM_PLANS = new Set(['growth', 'lifetime_founder']);

/** Each variation is a separate model call, so this is a spend cap too. */
const MAX_VARIATIONS = 4;

/**
 * Generate a model wearing one of the merchant's own products.
 *
 * The inverse of try-on: no shopper, no photograph of a person, and the output
 * is kept. A try-on is momentary and belongs to whoever asked for it; a model
 * shot is a marketing asset destined for the merchant's own product page, so it
 * goes to storage and gets a stable URL.
 */
export async function POST(request: Request) {
    try {
        const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
        if (!token) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

        const body = await request.json();
        const productId = typeof body.productId === 'string' ? body.productId : '';
        if (!productId) return NextResponse.json({ error: 'productId is required.' }, { status: 400 });

        // The merchant must own the product. Without this check a signed-in user
        // could generate assets from any product id in the table — including a
        // competitor's catalogue, billed to nobody.
        const { data: owned } = await supabase
            .from('merchants')
            .select('id, plan, house_model_url')
            .eq('owner_user_id', user.id)
            .order('created_at', { ascending: false });

        const merchant = owned?.[0];
        if (!merchant) return NextResponse.json({ error: 'No store found on this account.' }, { status: 403 });

        if (!ASSET_PLANS.has(merchant.plan)) {
            return NextResponse.json(
                { error: 'Model shots are included on Pro and above.', upgrade: true },
                { status: 402 }
            );
        }

        const { data: product } = await supabase
            .from('products')
            .select('id, title, primary_image_url, merchant_id')
            .eq('id', productId)
            .eq('merchant_id', merchant.id)
            .maybeSingle();

        if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
        if (!product.primary_image_url) {
            return NextResponse.json({ error: 'That product has no image to work from.' }, { status: 400 });
        }

        const model = typeof body.model === 'string' ? body.model.slice(0, 300) : '';
        const requestedScene = typeof body.scene === 'string' ? body.scene.slice(0, 400).trim() : '';

        // A described scene is a higher-tier feature. Ignore it rather than fail:
        // a Pro merchant who types one still gets their model shot on white,
        // which is what they are entitled to and what they mostly wanted.
        const scene = SCENE_PLANS.has(merchant.plan) ? requestedScene : '';

        const premium = PREMIUM_PLANS.has(merchant.plan);

        const requestedVariations = Number(body.variations) || 1;
        const variations = premium
            ? Math.max(1, Math.min(MAX_VARIATIONS, Math.floor(requestedVariations)))
            : 1;

        const houseModelUrl =
            premium && body.useHouseModel && merchant.house_model_url
                ? merchant.house_model_url
                : undefined;

        // In parallel. Four sequential calls would sit a merchant in front of a
        // spinner for well over a minute.
        const results = await Promise.allSettled(
            Array.from({ length: variations }, () =>
                aiEngine.generateModelShot({
                    productImageUrl: product.primary_image_url!,
                    productTitle: product.title,
                    model,
                    scene,
                    houseModelUrl,
                })
            )
        );

        const succeeded = results.filter(
            (r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled'
        );

        if (!succeeded.length) {
            const first = results[0];
            const reason =
                first?.status === 'rejected'
                    ? (first as PromiseRejectedResult).reason?.message
                    : 'Generation failed.';
            return NextResponse.json({ error: reason || 'Generation failed.' }, { status: 502 });
        }

        // Partial success is still success: asking for four and getting three is
        // a better outcome than discarding the three.
        const stored: { id: string; url: string }[] = [];

        for (const settled of succeeded) {
            const result = settled.value;

            // Data URL to bytes. Keeping the data URL in Postgres would put
            // megabytes into a row that is read on every dashboard load.
            const match = String(result.resultUrl).match(/^data:(.+);base64,(.+)$/);
            if (!match) continue;

            const contentType = match[1];
            const bytes = Buffer.from(match[2], 'base64');
            const extension = contentType.includes('png') ? 'png' : 'jpg';
            const path = `${merchant.id}/${product.id}/${crypto.randomUUID()}.${extension}`;

            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(path, bytes, { contentType, upsert: false });

            if (uploadError) {
                console.error('[API/ModelShot] Upload failed:', uploadError.message);
                continue;
            }

            const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(path);

            const { data: asset } = await supabase
                .from('product_assets')
                .insert({
                    merchant_id: merchant.id,
                    product_id: product.id,
                    kind: 'model_shot',
                    storage_path: path,
                    public_url: publicUrl,
                    options: {
                        model: model || null,
                        scene: scene || null,
                        houseModel: Boolean(houseModelUrl),
                    },
                })
                .select('id, public_url')
                .single();

            stored.push({ id: asset?.id || path, url: asset?.public_url || publicUrl });
        }

        if (!stored.length) {
            return NextResponse.json({ error: 'Generated, but could not be saved.' }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            assets: stored,
            requested: variations,
            // Reported so the client can say "3 of 4" rather than quietly
            // returning fewer than were asked for.
            generated: stored.length,
        });
    } catch (err: any) {
        console.error('[API/ModelShot]', err?.message || err);
        return NextResponse.json({ error: err?.message || 'Could not generate that.' }, { status: 500 });
    }
}

/** A merchant's generated assets, newest first. */
export async function GET(request: Request) {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ assets: [] }, { status: 401 });

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ assets: [] }, { status: 401 });

    const { data: owned } = await supabase
        .from('merchants')
        .select('id')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false });

    const merchantId = owned?.[0]?.id;
    if (!merchantId) return NextResponse.json({ assets: [] });

    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');

    let query = supabase
        .from('product_assets')
        .select('id, product_id, public_url, options, created_at')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(60);

    if (productId) query = query.eq('product_id', productId);

    const { data: assets } = await query;
    return NextResponse.json({ assets: assets || [] });
}

/**
 * Designate a generated shot as the house model, or clear it.
 *
 * Stored on the merchant rather than as another asset row: there is exactly one,
 * and it is a property of the brand rather than of any product.
 */
export async function PATCH(request: Request) {
    try {
        const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
        if (!token) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

        const { data: owned } = await supabase
            .from('merchants')
            .select('id, plan')
            .eq('owner_user_id', user.id)
            .order('created_at', { ascending: false });

        const merchant = owned?.[0];
        if (!merchant) return NextResponse.json({ error: 'No store found.' }, { status: 403 });
        if (!PREMIUM_PLANS.has(merchant.plan)) {
            return NextResponse.json(
                { error: 'A house model is included on Growth and above.', upgrade: true },
                { status: 402 }
            );
        }

        const body = await request.json();
        const assetId = typeof body.assetId === 'string' ? body.assetId : '';

        if (!assetId) {
            await supabase
                .from('merchants')
                .update({ house_model_url: null, house_model_description: null })
                .eq('id', merchant.id);
            return NextResponse.json({ ok: true, houseModelUrl: null });
        }

        // Scoped to this merchant: otherwise any asset id would do, and a brand
        // could adopt another brand's model as their own.
        const { data: asset } = await supabase
            .from('product_assets')
            .select('public_url, options')
            .eq('id', assetId)
            .eq('merchant_id', merchant.id)
            .maybeSingle();

        if (!asset) return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });

        await supabase
            .from('merchants')
            .update({
                house_model_url: asset.public_url,
                house_model_description: (asset.options as any)?.model || null,
            })
            .eq('id', merchant.id);

        return NextResponse.json({ ok: true, houseModelUrl: asset.public_url });
    } catch (err: any) {
        console.error('[API/ModelShot PATCH]', err?.message || err);
        return NextResponse.json({ error: 'Could not update the house model.' }, { status: 500 });
    }
}
