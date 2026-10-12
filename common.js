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
 * Werkt volgens het Banken & Incognito-principe met een vergrendelde blackout-tijd:
 * Zodra een screenshot sneltoets (bv. Windows+Shift+S, Mac Cmd+Shift+4, PrintScreen)
 * of focusverlies optreedt, vergrendelt het scherm op 100% zwart.
 */
function initScreenshotProtection() {
    // Zorg dat het blackout schild element in de DOM staat
    let shield = document.getElementById('screenshot-shield');
    if (!shield) {
        shield = document.createElement('div');
        shield.id = 'screenshot-shield';
        shield.setAttribute('aria-hidden', 'true');
        shield.innerHTML = '<span class="shield-notice">Franco Soolsma — Beveiligde weergave (Klik om te herstellen)</span>';
        document.body.appendChild(shield);
    }

    let screenshotLockUntil = 0;
    let lockTimer = null;

    const enableBlackout = () => {
        document.documentElement.classList.add('screenshot-active');
        document.body.classList.add('screenshot-active');
    };

    const disableBlackout = (force = false) => {
        if (!force && Date.now() < screenshotLockUntil) {
            // Vergrendeling actief (bv. Knipprogramma staat nog open), blijf zwart!
            return;
        }
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

    const triggerLockedBlackout = (durationMs = 6000) => {
        screenshotLockUntil = Date.now() + durationMs;
        enableBlackout();
        wipeClipboard();

        clearTimeout(lockTimer);
        lockTimer = setTimeout(() => {
            if (document.hasFocus() && Date.now() >= screenshotLockUntil) {
                disableBlackout(true);
            }
        }, durationMs);
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

    // 1. FOCUSVERLIES (Mac Cmd+Shift+4, Knipprogramma, externe screenshot apps):
    window.addEventListener('blur', () => {
        if (isOverIframe || (document.activeElement && document.activeElement.tagName === 'IFRAME')) {
            return;
        }
        // Vergrendel zwart scherm zodat de kniptool uitsluitend zwart ziet
        triggerLockedBlackout(5000);
    });

    // Zodra gebruiker terugkeert: herstel alleen als lock verstreken is
    window.addEventListener('focus', () => {
        if (Date.now() >= screenshotLockUntil) {
            disableBlackout();
        }
    });

    // Klik/tap om na het screenshotten (of annuleren) de weergave direct te herstellen
    window.addEventListener('pointerdown', () => {
        if (document.body.classList.contains('screenshot-active')) {
            disableBlackout(true);
        }
    }, true);

    // Wanneer het tabblad verborgen of geminimaliseerd wordt
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            enableBlackout();
        } else if (Date.now() >= screenshotLockUntil) {
            disableBlackout();
        }
    });

    // 2. SNELTOETSEN DETECTIE (VOORAF INGRIJPEN):
    window.addEventListener('keydown', (e) => {
        const isInput = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');

        // A. Windows PrintScreen toets
        if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
            triggerLockedBlackout(5000);
            return;
        }

        // B. Mac sneltoetsen (Cmd + Shift + 3 / 4 / 5) of Windows (Win + Shift + S / Ctrl + Shift + S)
        const hasModifiers = (e.metaKey || e.ctrlKey) && e.shiftKey;
        const isSnippingKey = e.shiftKey && (e.key === 's' || e.key === 'S' || e.code === 'KeyS');

        if (hasModifiers) {
            // Uitzondering voor Redo (Cmd+Shift+Z) in formuliervelden
            if (isInput && (e.key === 'z' || e.key === 'Z')) {
                return;
            }
            triggerLockedBlackout(6000);
            return;
        }

        // Als gebruiker buiten een invoerveld Shift+S indrukt (Windows Snipping Tool):
        if (!isInput && isSnippingKey) {
            triggerLockedBlackout(6000);
            return;
        }
    }, true);

    window.addEventListener('keyup', (e) => {
        if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
            triggerLockedBlackout(5000);
        }
        // Bij keyup GEEN blackout uitschakelen: Knipprogramma staat dan net open!
    }, true);

    // 3. PRINT & PDF BLOKKADE
    window.addEventListener('beforeprint', () => {
        triggerLockedBlackout(8000);
    });

    window.addEventListener('afterprint', () => {
        disableBlackout(true);
    });
}