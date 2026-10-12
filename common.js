document.addEventListener('DOMContentLoaded', () => {
    // 1. Automatisch het jaartal in de footer updaten
    const footerP = document.querySelector('footer p');
    if (footerP) {
        const currentYear = new Date().getFullYear();
        footerP.innerHTML = `&copy; ${currentYear} Portfolio Franco A. Soolsma. All rights reserved.`;
    }

    // 2. Afbeeldingen beschermen tegen downloaden, slepen en contextmenu
    initImageProtection();

    // 3. Screenshot detectie en verduistering (banken / incognito modus)
    initScreenshotProtection();
});

/**
 * Zorgt ervoor dat afbeeldingen niet downloadbaar zijn via contextmenu, slepen of selecteren.
 */
function initImageProtection() {
    // Voorkom contextmenu (rechtermuisknop / lang indrukken) op afbeeldingen en video's
    document.addEventListener('contextmenu', (e) => {
        if (e.target.tagName === 'IMG' || e.target.closest('img') ||
            e.target.tagName === 'VIDEO' || e.target.closest('video') ||
            e.target.closest('.image-container') || e.target.closest('.column-photos')) {
            e.preventDefault();
            return false;
        }
    }, { capture: true });

    // Voorkom slepen van afbeeldingen naar bureaublad of een nieuw tabblad
    document.addEventListener('dragstart', (e) => {
        if (e.target.tagName === 'IMG' || e.target.closest('img') ||
            e.target.tagName === 'VIDEO' || e.target.closest('video')) {
            e.preventDefault();
            return false;
        }
    }, { capture: true });

    // Zet draggable="false" op alle afbeeldingen
    const makeImagesUndraggable = () => {
        document.querySelectorAll('img, video').forEach((el) => {
            el.setAttribute('draggable', 'false');
        });
    };
    makeImagesUndraggable();

    // Dynamisch toegevoegde afbeeldingen ook beschermen
    if (window.MutationObserver) {
        const observer = new MutationObserver(() => makeImagesUndraggable());
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Voorkom kopiëren van geselecteerde afbeeldingen
    document.addEventListener('copy', (e) => {
        const selection = window.getSelection();
        if (selection && selection.anchorNode) {
            const el = selection.anchorNode.nodeType === 1 ? selection.anchorNode : selection.anchorNode.parentElement;
            if (el && (el.tagName === 'IMG' || el.querySelector?.('img'))) {
                e.preventDefault();
                if (e.clipboardData) {
                    e.clipboardData.setData('text/plain', '');
                }
            }
        }
    });

    // Blokkeer Ctrl+S / Cmd+S (pagina / afbeelding opslaan sneltoets)
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
            e.preventDefault();
        }
    });
}

/**
 * Detecteert screenshot pogingen en maakt de pagina / afbeeldingen direct zwart.
 * Werkt volgens het Banken & Incognito-principe: zodra het venster focus verliest
 * (zoals bij macOS Cmd+Shift+4, Windows Snipping Tool, of externe screenshot apps),
 * wordt het scherm direct 100% zwart.
 */
function initScreenshotProtection() {
    // Zorg dat het blackout schild element in de DOM staat
    let shield = document.getElementById('screenshot-shield');
    if (!shield) {
        shield = document.createElement('div');
        shield.id = 'screenshot-shield';
        shield.setAttribute('aria-hidden', 'true');
        shield.innerHTML = '<span class="shield-notice">Franco Soolsma — Beveiligde weergave</span>';
        document.body.appendChild(shield);
    }

    const enableBlackout = () => {
        document.documentElement.classList.add('screenshot-active');
        document.body.classList.add('screenshot-active');
    };

    const disableBlackout = () => {
        document.documentElement.classList.remove('screenshot-active');
        document.body.classList.remove('screenshot-active');
    };

    const wipeClipboard = () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText('');
            }
        } catch (err) {}
    };

    // Tracking van interactie met YouTube iframes om valse blackouts te voorkomen
    let isOverIframe = false;
    const registerIframes = () => {
        document.querySelectorAll('iframe').forEach(iframe => {
            iframe.addEventListener('pointerenter', () => { isOverIframe = true; });
            iframe.addEventListener('pointerleave', () => { isOverIframe = false; });
            iframe.addEventListener('mouseenter', () => { isOverIframe = true; });
            iframe.addEventListener('mouseleave', () => { isOverIframe = false; });
        });
    };
    registerIframes();
    if (window.MutationObserver) {
        new MutationObserver(registerIframes).observe(document.body, { childList: true, subtree: true });
    }

    // 1. BANKEN & INCOGNITO METHODE:
    // Zodra het venster focus verliest (bv. door Mac Cmd+Shift+4 draadkruis, Windows Snipping Tool,
    // of externe screenshot apps zoals CleanShot, Lightshot, Shottr etc.) -> direct zwart!
    window.addEventListener('blur', () => {
        // Uitzondering: gebruiker klikte op een video iframe (YouTube) om af te spelen
        if (isOverIframe || (document.activeElement && document.activeElement.tagName === 'IFRAME')) {
            return;
        }
        enableBlackout();
    });

    // Zodra de gebruiker weer terugkeert op de website -> herstel weergave
    window.addEventListener('focus', () => {
        disableBlackout();
    });

    // Wanneer het tabblad geminimaliseerd of verborgen wordt
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            enableBlackout();
        } else {
            disableBlackout();
        }
    });

    // 2. SNELTOETSEN DETECTIE (VOORAF INGRIJPEN):
    // Zodra Cmd+Shift (Mac) of Ctrl+Shift (Windows) wordt ingedrukt, verduister DIRECT
    // voordat de '3', '4' of 's' toets zelfs maar verwerkt is!
    window.addEventListener('keydown', (e) => {
        // Windows PrintScreen toets
        if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
            enableBlackout();
            wipeClipboard();
            return;
        }

        // Mac: Cmd + Shift combinaties (Cmd+Shift+3, Cmd+Shift+4, etc.)
        // Windows: Ctrl + Shift / Win + Shift
        if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
            // Uitzondering voor Redo (Cmd+Shift+Z) in formuliervelden
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && (e.key === 'z' || e.key === 'Z')) {
                return;
            }
            enableBlackout();
            wipeClipboard();
            return;
        }
    }, true);

    window.addEventListener('keyup', (e) => {
        if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
            enableBlackout();
            wipeClipboard();
        }
        // Als modifier toetsen zijn losgelaten en het venster heeft focus, herstel
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && document.hasFocus()) {
            disableBlackout();
        }
    }, true);

    // 3. PRINT & PDF BLOKKADE
    window.addEventListener('beforeprint', () => {
        enableBlackout();
    });

    window.addEventListener('afterprint', () => {
        disableBlackout();
    });
}