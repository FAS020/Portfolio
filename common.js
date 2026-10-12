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
 */
function initScreenshotProtection() {
    // Zorg dat het blackout schild element in de DOM staat
    let shield = document.getElementById('screenshot-shield');
    if (!shield) {
        shield = document.createElement('div');
        shield.id = 'screenshot-shield';
        shield.setAttribute('aria-hidden', 'true');
        document.body.appendChild(shield);
    }

    let blackoutTimer = null;

    const triggerBlackout = (duration = 2000) => {
        document.body.classList.add('screenshot-active');

        // Wis het klembord om eventuele gekopieerde screenshots/data te overschrijven
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText('');
            }
        } catch (err) {}

        clearTimeout(blackoutTimer);
        blackoutTimer = setTimeout(() => {
            document.body.classList.remove('screenshot-active');
        }, duration);
    };

    // Herstel direct wanneer gebruiker weer actief focust of klikt
    const cancelBlackout = () => {
        if (document.body.classList.contains('screenshot-active')) {
            document.body.classList.remove('screenshot-active');
            clearTimeout(blackoutTimer);
        }
    };

    window.addEventListener('focus', cancelBlackout);

    // Track of screenshot modifier toetsen (Cmd / Ctrl / Shift) worden ingedrukt
    let modifierActive = false;

    window.addEventListener('keydown', (e) => {
        // Windows / Linux PrintScreen toets
        if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
            triggerBlackout(2500);
            return;
        }

        // Mac screenshot sneltoetsen: Cmd + Shift + 3, Cmd + Shift + 4, Cmd + Shift + 5, Cmd + Shift + 6
        const isMacScreenshot = (e.metaKey && e.shiftKey) && (
            e.key === '3' || e.key === '4' || e.key === '5' || e.key === '6' ||
            e.code === 'Digit3' || e.code === 'Digit4' || e.code === 'Digit5' || e.code === 'Digit6'
        );

        // Windows Snipping Tool / Snip & Sketch: Win+Shift+S of Ctrl+Shift+S
        const isWindowsSnipping = (e.shiftKey && (e.metaKey || e.ctrlKey)) && (
            e.key === 's' || e.key === 'S' || e.code === 'KeyS'
        );

        if (isMacScreenshot || isWindowsSnipping) {
            triggerBlackout(2500);
            return;
        }

        if (e.metaKey || e.ctrlKey || e.shiftKey) {
            modifierActive = true;
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
            triggerBlackout(2500);
        }
        modifierActive = false;
    });

    // Wanneer een screenshot tool (zoals Mac Cmd+Shift+4 crosshair of Windows Snipping Tool) focus steelt
    window.addEventListener('blur', () => {
        if (modifierActive) {
            triggerBlackout(3000);
        }
    });

    // Detecteer print / opslaan als PDF acties
    window.addEventListener('beforeprint', () => {
        triggerBlackout(5000);
    });

    // Ondersteuning voor matchMedia print
    if (window.matchMedia) {
        const mediaQueryList = window.matchMedia('print');
        mediaQueryList.addEventListener?.('change', (mql) => {
            if (mql.matches) {
                triggerBlackout(5000);
            }
        });
    }
}