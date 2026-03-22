interface WidgetConfig {
    merchantId: string;
    productSelector?: string;
    imageSelector?: string;
    variantSelector?: string;
    priceSelector?: string;
    titleSelector?: string;
}

class EmodeWidget {
    private config: WidgetConfig;
    private baseUrl: string;

    constructor() {
        console.log('[EmodeWidget] Initializing...');
        this.config = this.parseConfig();
        console.log('[EmodeWidget] Config:', this.config);

        const isDev = window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.protocol === 'file:';
        // Force http for localhost to avoid mixed content issues if testing from http
        // But if testing from file://, strict http:// is needed.
        this.baseUrl = isDev ? 'http://localhost:3000' : 'https://emode.app';
        console.log('[EmodeWidget] BaseURL:', this.baseUrl);

        this.init();
    }

    private parseConfig(): WidgetConfig {
        const script = document.currentScript as HTMLScriptElement;
        return {
            merchantId: script?.dataset.emodeMerchant || '',
            productSelector: script?.dataset.productSelector,
            imageSelector: script?.dataset.imageSelector,
            variantSelector: script?.dataset.variantSelector,
            priceSelector: script?.dataset.priceSelector,
            titleSelector: script?.dataset.titleSelector,
        };
    }

    private init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.injectButtons());
        } else {
            this.injectButtons();
        }
    }

    private injectButtons() {
        console.log('[EmodeWidget] Attempting to inject buttons...');
        const productContext = this.extractProductContext();
        if (!productContext) {
            console.warn('[EmodeWidget] Could not extract product context. Buttons will not appear on this page.');
            return;
        }
        console.log('[EmodeWidget] Context extracted:', productContext);

        const container = document.querySelector(this.config.productSelector || '.product-single, .product');
        if (!container) {
            console.error('[EmodeWidget] Product container not found.');
            return;
        }

        const buttonGroup = document.createElement('div');
        buttonGroup.style.display = 'flex';
        buttonGroup.style.flexDirection = 'row';
        buttonGroup.style.gap = '8px';
        buttonGroup.style.margin = '16px 0';
        buttonGroup.className = 'emode-integration-container';

        const tryBtn = this.createButton('Try On', 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)');
        tryBtn.style.flex = '1';
        tryBtn.style.padding = '12px 16px';
        tryBtn.style.fontSize = '10px';
        tryBtn.onclick = () => this.openModal(productContext);

        const dressingBtn = this.createButton('Dressing Room', 'transparent');
        dressingBtn.style.flex = '1';
        dressingBtn.style.padding = '12px 16px';
        dressingBtn.style.fontSize = '10px';
        dressingBtn.style.background = 'white';
        dressingBtn.style.color = '#0a0a0a';
        dressingBtn.style.border = '1px solid rgba(0,0,0,0.1)';
        dressingBtn.style.boxShadow = '0 2px 10px rgba(0,0,0,0.02)';
        dressingBtn.onclick = () => this.addToDressingRoom(productContext);

        buttonGroup.appendChild(tryBtn);
        buttonGroup.appendChild(dressingBtn);

        // Inject near Add to Cart button if possible
        const addToCartBtn = container.querySelector('button[name="add"], .add-to-cart, .product-form__submit');
        if (addToCartBtn) {
            addToCartBtn.parentNode?.insertBefore(buttonGroup, addToCartBtn);
            console.log('[EmodeWidget] Injected before Add to Cart button.');
        } else {
            container.appendChild(buttonGroup);
            console.log('[EmodeWidget] Injected at end of container.');
        }
    }

    private extractProductContext() {
        console.log('[EmodeWidget] Extracting product context logic...');

        const container = document.querySelector(this.config.productSelector || '.product-single, .product, .product-card');

        // 1. Try explicit title selector from config
        let titleElement = this.config.titleSelector
            ? document.querySelector(this.config.titleSelector)
            : null;

        // 2. If not found, look for headings inside the product container
        if (!titleElement && container) {
            titleElement = container.querySelector('h1, h2, h3, .product-title, .title');
        }

        // 3. Fallback to global h1
        if (!titleElement) {
            titleElement = document.querySelector('h1');
        }

        const title = titleElement?.textContent?.trim();

        // Image Extraction Logic
        let image: string | undefined;
        if (this.config.imageSelector) {
            image = (document.querySelector(this.config.imageSelector) as HTMLImageElement)?.src;
        }

        if (!image && container) {
            // Find most prominent image in container
            const imgs = Array.from(container.querySelectorAll('img')).filter(img => img.width > 100);
            image = imgs[0]?.src;
        }

        if (!image) {
            image = (document.querySelector('img[src*="products"]') as HTMLImageElement)?.src ||
                (document.querySelector('img') as HTMLImageElement)?.src;
        }

        // Price Extraction
        const price = (this.config.priceSelector ? document.querySelector(this.config.priceSelector) :
            (container?.querySelector('.price, .product-price, [class*="price"]') || document.querySelector('.price')))?.textContent?.trim();

        console.log('[EmodeWidget] Extracted values:', { title, image, price });

        if (!title || !image) return null;

        return { title, image, price };
    }

    private createButton(text: string, background: string) {
        const btn = document.createElement('button');
        btn.textContent = text.toUpperCase();
        btn.style.background = background;
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.padding = '16px 24px';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = 'bold';
        btn.style.letterSpacing = '0.1em';
        btn.style.fontSize = '12px';
        btn.style.transition = 'transform 0.2s ease';
        btn.style.width = '100%';
        btn.onmouseover = () => btn.style.transform = 'scale(1.02)';
        btn.onmouseout = () => btn.style.transform = 'scale(1)';
        return btn;
    }

    private openModal(context: any, tab: 'try-on' | 'dressing-room' = 'try-on', action?: 'add') {
        // Prevent duplicate overlays
        if (document.getElementById('emode-widget-overlay')) return;

        const modalUrl = `${this.baseUrl}/modal?merchant=${this.config.merchantId}&title=${encodeURIComponent(context.title)}&image=${encodeURIComponent(context.image)}&price=${encodeURIComponent(context.price || '')}&tab=${tab}${action ? `&action=${action}` : ''}&source=widget`;
        console.log('[EmodeWidget] Opening modal:', modalUrl);

        const overlay = document.createElement('div');
        overlay.id = 'emode-widget-overlay';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0,0,0,0.4)';
        overlay.style.backdropFilter = 'blur(20px)';
        (overlay.style as any).webkitBackdropFilter = 'blur(20px)';
        overlay.style.zIndex = '99999999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.padding = '20px';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.4s ease';

        // Trigger fade in
        setTimeout(() => overlay.style.opacity = '1', 10);

        const closeOverlay = () => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
            document.body.style.overflow = '';
        };

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '20px';
        closeBtn.style.right = '20px';
        closeBtn.style.background = 'rgba(255,255,255,0.15)';
        closeBtn.style.border = 'none';
        closeBtn.style.color = 'white';
        closeBtn.style.fontSize = '24px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.width = '40px';
        closeBtn.style.height = '40px';
        closeBtn.style.borderRadius = '50%';
        closeBtn.style.display = 'flex';
        closeBtn.style.alignItems = 'center';
        closeBtn.style.justifyContent = 'center';
        closeBtn.style.transition = 'background 0.2s';
        closeBtn.style.zIndex = '10';
        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,0.3)';
        closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,0.15)';
        closeBtn.onclick = closeOverlay;

        const iframe = document.createElement('iframe');
        iframe.src = modalUrl;
        iframe.style.width = '95%';
        iframe.style.height = '95%';
        iframe.style.maxWidth = '1100px';
        iframe.style.maxHeight = '850px';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '24px';
        iframe.style.boxShadow = '0 30px 60px rgba(0,0,0,0.5)';
        iframe.setAttribute('allow', 'camera;microphone');

        overlay.onclick = (e) => {
            if (e.target === overlay) closeOverlay();
        };

        // Escape key to close
        const escHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeOverlay();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // postMessage bridge — listen for close/cart from iframe
        const messageHandler = (e: MessageEvent) => {
            if (!e.data || typeof e.data !== 'object') return;
            if (e.data.type === 'emode:close') {
                closeOverlay();
                window.removeEventListener('message', messageHandler);
            }
            if (e.data.type === 'emode:add-to-cart') {
                console.log('[EmodeWidget] Add to cart requested:', e.data);
                // Widget hosts can listen for this event to handle cart integration
                window.dispatchEvent(new CustomEvent('emode:cart-add', { detail: e.data }));
                closeOverlay();
                window.removeEventListener('message', messageHandler);
            }
        };
        window.addEventListener('message', messageHandler);

        overlay.appendChild(closeBtn);
        overlay.appendChild(iframe);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
    }

    private addToDressingRoom(context: any) {
        console.log('Adding to dressing room:', context);
        this.openModal(context, 'dressing-room', 'add');
    }
}

new EmodeWidget();
