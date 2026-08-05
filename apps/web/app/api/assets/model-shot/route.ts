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
            .select('id, plan')
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
            return NextResponse.json(
                { error: 'That product has no image to work from.' },
                { status: 400 }
            );
        }

        const model = typeof body.model === 'string' ? body.model.slice(0, 300) : '';
        const requestedScene = typeof body.scene === 'string' ? body.scene.slice(0, 400).trim() : '';

        // A described scene is a higher-tier feature. Ignore it rather than fail:
        // a Pro merchant who types one still gets their model shot on white,
        // which is what they are entitled to and what they mostly wanted.
        const scene = SCENE_PLANS.has(merchant.plan) ? requestedScene : '';

        const result = await aiEngine.generateModelShot({
            productImageUrl: product.primary_image_url,
            productTitle: product.title,
            model,
            scene,
        });

        // Data URL to bytes. Storing the data URL in Postgres instead would put
        // multiple megabytes in a row that is read on every dashboard load.
        const match = result.resultUrl.match(/^data:(.+);base64,(.+)$/);
        if (!match) return NextResponse.json({ error: 'Generation returned no usable image.' }, { status: 502 });

        const contentType = match[1];
        const bytes = Buffer.from(match[2], 'base64');
        const extension = contentType.includes('png') ? 'png' : 'jpg';
        const path = `${merchant.id}/${product.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
            .from('assets')
            .upload(path, bytes, { contentType, upsert: false });

        if (uploadError) {
            console.error('[API/ModelShot] Upload failed:', uploadError.message);
            return NextResponse.json({ error: 'Generated, but could not be saved.' }, { status: 500 });
        }

        const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(path);

        const { data: asset, error: insertError } = await supabase
            .from('product_assets')
            .insert({
                merchant_id: merchant.id,
                product_id: product.id,
                kind: 'model_shot',
                storage_path: path,
                public_url: publicUrl,
                options: { model: model || null, scene: scene || null },
            })
            .select('id, public_url, created_at')
            .single();

        if (insertError) {
            console.error('[API/ModelShot] Insert failed:', insertError.message);
            // The image is in storage and reachable, so return it rather than
            // pretending the whole thing failed over a bookkeeping row.
            return NextResponse.json({ ok: true, url: publicUrl, unlisted: true });
        }

        return NextResponse.json({
            ok: true,
            url: asset.public_url,
            assetId: asset.id,
            processingTimeMs: result.processingTimeMs,
        });
    } catch (err: any) {
        console.error('[API/ModelShot]', err?.message || err);
        return NextResponse.json(
            { error: err?.message || 'Could not generate that.' },
            { status: 500 }
        );
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
