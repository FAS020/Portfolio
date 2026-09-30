/**
 * floating-widgets.js
 *
 * Nieuwe versie voor:
 * - floating-video-widget
 * - floating-booking-widget
 *
 * Functies:
 * - Popup slepen via header
 * - Geminimaliseerde pill slepen
 * - Klik op pill = popup openen
 * - Sluiten = minimaliseren
 * - Positie onthouden
 * - Geminimaliseerde status onthouden
 * - Popup blijft binnen scherm
 * - Video-resize groeit naar RECHTS
 * - Workshopformulier
 */

(function () {
    'use strict';

    const STORAGE_PREFIX = 'franco-floating-widget-';

    class FloatingWidget {

        constructor(element) {

            this.el = element;

            this.window = element.querySelector('.floating-window');
            this.header = element.querySelector('.floating-header');
            this.pill = element.querySelector('.floating-min-pill');
            this.closeButton = element.querySelector('.floating-btn-close');
            this.resizeHandle = element.querySelector('.floating-resize-br');
            this.dragShield = element.querySelector('.floating-drag-shield');

            if (!this.window || !this.pill) {
                return;
            }

            this.id = element.id || 'floating-widget';

            this.storageKey =
                STORAGE_PREFIX + this.id;

            this.dragging = false;
            this.resizing = false;
            this.moved = false;

            this.pointerStartX = 0;
            this.pointerStartY = 0;

            this.elementStartLeft = 0;
            this.elementStartTop = 0;

            this.resizeStartX = 0;
            this.resizeStartWidth = 0;
            this.resizeStartLeft = 0;

            this.dragType = null;

            this.moveHandler =
                this.onPointerMove.bind(this);

            this.upHandler =
                this.onPointerUp.bind(this);

            this.resizeMoveHandler =
                this.onResizeMove.bind(this);

            this.resizeUpHandler =
                this.onResizeUp.bind(this);

            this.setup();
        }


        /*
         * INITIALISATIE
         */

        setup() {

            /*
             * De widget wordt rechtstreeks onder body gezet.
             *
             * Hierdoor kunnen containers zoals:
             * transform
             * overflow
             * columns
             * flex containers
             *
             * de fixed popup niet meer verkeerd positioneren.
             */

            if (this.el.parentElement !== document.body) {
                document.body.appendChild(this.el);
            }


            /*
             * Oude transform verwijderen.
             */

            this.el.style.transform = 'none';

            this.el.style.right = 'auto';

            this.el.style.bottom = 'auto';


            /*
             * Vorige positie/status terugzetten.
             */

            this.restoreState();


            /*
             * HEADER SLEPEN
             */

            if (this.header) {

                this.header.addEventListener(
                    'pointerdown',
                    (event) => {

                        if (
                            event.button !== undefined &&
                            event.button !== 0
                        ) {
                            return;
                        }

                        /*
                         * Knoppen en form-elementen
                         * mogen niet de popup slepen.
                         */

                        if (
                            event.target.closest(
                                'button, a, input, select, textarea'
                            )
                        ) {
                            return;
                        }

                        this.beginDrag(
                            event,
                            'window'
                        );
                    }
                );
            }


            /*
             * GEMINIMALISEERDE PILL
             */

            this.pill.addEventListener(
                'pointerdown',
                (event) => {

                    if (
                        event.button !== undefined &&
                        event.button !== 0
                    ) {
                        return;
                    }

                    this.beginDrag(
                        event,
                        'pill'
                    );
                }
            );


            /*
             * MINIMALISEER-KNOP
             */

            if (this.closeButton) {

                this.closeButton.addEventListener(
                    'click',
                    (event) => {

                        event.preventDefault();

                        event.stopPropagation();

                        this.minimize();
                    }
                );
            }


            /*
             * VIDEO RESIZE HANDLE
             */

            if (this.resizeHandle) {

                this.resizeHandle.addEventListener(
                    'pointerdown',
                    (event) => {

                        this.beginResize(event);
                    }
                );
            }


            /*
             * SCHERM GROOTTE VERANDERT
             */

            window.addEventListener(
                'resize',
                () => {

                    this.keepInsideViewport();

                    this.saveState();
                }
            );


            /*
             * Na eerste layout nog een keer
             * controleren.
             */

            requestAnimationFrame(() => {

                this.keepInsideViewport();
            });
        }


        /*
         * LOCAL STORAGE
         */

        getState() {

            try {

                return JSON.parse(
                    localStorage.getItem(
                        this.storageKey
                    ) || '{}'
                );

            } catch (error) {

                return {};
            }
        }


        saveState() {

            const rect =
                this.el.getBoundingClientRect();

            try {

                localStorage.setItem(
                    this.storageKey,
                    JSON.stringify({

                        left:
                            Math.round(rect.left),

                        top:
                            Math.round(rect.top),

                        minimized:
                            this.el.classList.contains(
                                'is-minimized'
                            ),

                        width:
                            this.window.offsetWidth
                    })
                );

            } catch (error) {

                /*
                 * LocalStorage kan door
                 * browserinstellingen geblokkeerd zijn.
                 */
            }
        }


        restoreState() {

            const state =
                this.getState();


            /*
             * Alleen video heeft een resize-breedte.
             */

            if (
                state.width &&
                this.id === 'floating-video-widget'
            ) {

                const width =
                    this.limitVideoWidth(
                        Number(state.width)
                    );

                this.window.style.width =
                    width + 'px';
            }


            /*
             * Minimaliseren terugzetten.
             */

            if (state.minimized) {

                this.el.classList.add(
                    'is-minimized'
                );

            } else {

                this.el.classList.remove(
                    'is-minimized'
                );
            }


            /*
             * Wachten tot browser de afmetingen
             * van popup/pill kent.
             */

            requestAnimationFrame(() => {

                if (
                    Number.isFinite(
                        Number(state.left)
                    ) &&
                    Number.isFinite(
                        Number(state.top)
                    )
                ) {

                    this.setPosition(
                        Number(state.left),
                        Number(state.top)
                    );

                } else {

                    this.center();
                }


                this.keepInsideViewport();

                this.saveState();
            });
        }


        /*
         * POPUP CENTREREN
         */

        center() {

            const rect =
                this.getActiveRect();

            const left =
                (window.innerWidth - rect.width) / 2;

            const top =
                (window.innerHeight - rect.height) / 2;

            this.setPosition(
                left,
                top
            );
        }


        /*
         * Welke afmeting moet worden gebruikt?
         */

        getActiveRect() {

            if (
                this.el.classList.contains(
                    'is-minimized'
                )
            ) {

                return this.pill.getBoundingClientRect();

            }

            return this.window.getBoundingClientRect();
        }


        /*
         * POSITIE INSTELLEN
         */

        setPosition(left, top) {

            this.el.style.left =
                Math.round(left) + 'px';

            this.el.style.top =
                Math.round(top) + 'px';

            this.el.style.right =
                'auto';

            this.el.style.bottom =
                'auto';
        }


        /*
         * BEGRENZINGEN VAN HET SCHERM
         */

        getBounds() {

            const rect =
                this.getActiveRect();

            const margin = 12;

            /*
             * Ruimte bovenaan voor eventuele
             * vaste navigatie.
             */

            const topMargin = 52;

            const bottomMargin = 12;

            return {

                minLeft:
                    margin,

                maxLeft:
                    Math.max(
                        margin,
                        window.innerWidth -
                        rect.width -
                        margin
                    ),

                minTop:
                    topMargin,

                maxTop:
                    Math.max(
                        topMargin,
                        window.innerHeight -
                        rect.height -
                        bottomMargin
                    )
            };
        }


        /*
         * ZORG DAT POPUP BINNEN SCHERM BLIJFT
         */

        keepInsideViewport() {

            const rect =
                this.el.getBoundingClientRect();

            const bounds =
                this.getBounds();


            const currentLeft =
                parseFloat(
                    this.el.style.left
                );

            const currentTop =
                parseFloat(
                    this.el.style.top
                );


            const left =
                Number.isFinite(currentLeft)
                    ? currentLeft
                    : rect.left;

            const top =
                Number.isFinite(currentTop)
                    ? currentTop
                    : rect.top;


            const safeLeft =
                Math.max(
                    bounds.minLeft,
                    Math.min(
                        left,
                        bounds.maxLeft
                    )
                );


            const safeTop =
                Math.max(
                    bounds.minTop,
                    Math.min(
                        top,
                        bounds.maxTop
                    )
                );


            this.setPosition(
                safeLeft,
                safeTop
            );
        }


        /*
         * DRAG START
         */

        beginDrag(event, type) {

            if (this.resizing) {
                return;
            }


            this.dragging = true;

            this.moved = false;

            this.dragType = type;


            this.pointerStartX =
                event.clientX;

            this.pointerStartY =
                event.clientY;


            const rect =
                this.el.getBoundingClientRect();


            this.elementStartLeft =
                rect.left;

            this.elementStartTop =
                rect.top;


            this.el.classList.add(
                'is-dragging'
            );


            if (this.dragShield) {

                this.dragShield.style.display =
                    'block';
            }


            window.addEventListener(
                'pointermove',
                this.moveHandler,
                {
                    passive: false
                }
            );

            window.addEventListener(
                'pointerup',
                this.upHandler
            );

            window.addEventListener(
                'pointercancel',
                this.upHandler
            );


            try {

                event.target.setPointerCapture?.(
                    event.pointerId
                );

            } catch (error) {}


            event.preventDefault();
        }


        /*
         * DRAG MOVE
         */

        onPointerMove(event) {

            if (!this.dragging) {
                return;
            }


            const dx =
                event.clientX -
                this.pointerStartX;

            const dy =
                event.clientY -
                this.pointerStartY;


            /*
             * Een kleine muisbeweging telt
             * nog als klik.
             */

            if (
                !this.moved &&
                Math.hypot(dx, dy) >= 4
            ) {

                this.moved = true;
            }


            if (!this.moved) {
                return;
            }


            event.preventDefault();


            const bounds =
                this.getBounds();


            const left =
                Math.max(
                    bounds.minLeft,
                    Math.min(
                        this.elementStartLeft + dx,
                        bounds.maxLeft
                    )
                );


            const top =
                Math.max(
                    bounds.minTop,
                    Math.min(
                        this.elementStartTop + dy,
                        bounds.maxTop
                    )
                );


            this.setPosition(
                left,
                top
            );
        }


        /*
         * DRAG STOP
         */

        onPointerUp() {

            if (!this.dragging) {
                return;
            }


            const wasPill =
                this.dragType === 'pill';

            const wasClick =
                !this.moved;


            this.dragging = false;

            this.el.classList.remove(
                'is-dragging'
            );


            if (this.dragShield) {

                this.dragShield.style.display =
                    'none';
            }


            window.removeEventListener(
                'pointermove',
                this.moveHandler
            );

            window.removeEventListener(
                'pointerup',
                this.upHandler
            );

            window.removeEventListener(
                'pointercancel',
                this.upHandler
            );


            /*
             * Klik op geminimaliseerde pill
             * = popup openen.
             */

            if (
                wasPill &&
                wasClick
            ) {

                this.expand();

            } else {

                this.saveState();
            }


            this.dragType = null;
        }


        /*
         * RESIZE START
         */

        beginResize(event) {

            /*
             * Alleen video mag resizen.
             */

            if (
                this.id !==
                'floating-video-widget'
            ) {
                return;
            }


            if (
                event.button !== undefined &&
                event.button !== 0
            ) {
                return;
            }


            event.preventDefault();

            event.stopPropagation();


            this.resizing = true;


            this.resizeStartX =
                event.clientX;


            this.resizeStartWidth =
                this.window.getBoundingClientRect().width;


            /*
             * Dit is de vaste linkerzijde.
             */

            this.resizeStartLeft =
                this.el.getBoundingClientRect().left;


            this.el.classList.add(
                'is-resizing'
            );


            if (this.dragShield) {

                this.dragShield.style.display =
                    'block';
            }


            window.addEventListener(
                'pointermove',
                this.resizeMoveHandler,
                {
                    passive: false
                }
            );

            window.addEventListener(
                'pointerup',
                this.resizeUpHandler
            );

            window.addEventListener(
                'pointercancel',
                this.resizeUpHandler
            );
        }


        /*
         * RESIZE MOVE
         *
         * Naar RECHTS slepen = groter.
         *
         * De linkerzijde verandert NIET.
         */

        onResizeMove(event) {

            if (!this.resizing) {
                return;
            }


            event.preventDefault();


            const delta =
                event.clientX -
                this.resizeStartX;


            const newWidth =
                this.limitVideoWidth(
                    this.resizeStartWidth +
                    delta
                );


            this.window.style.width =
                newWidth + 'px';


            /*
             * Linkerkant exact op zijn
             * oorspronkelijke plaats houden.
             */

            this.el.style.left =
                Math.round(
                    this.resizeStartLeft
                ) + 'px';
        }


        /*
         * RESIZE STOP
         */

        onResizeUp() {

            if (!this.resizing) {
                return;
            }


            this.resizing = false;


            this.el.classList.remove(
                'is-resizing'
            );


            if (this.dragShield) {

                this.dragShield.style.display =
                    'none';
            }


            window.removeEventListener(
                'pointermove',
                this.resizeMoveHandler
            );

            window.removeEventListener(
                'pointerup',
                this.resizeUpHandler
            );

            window.removeEventListener(
                'pointercancel',
                this.resizeUpHandler
            );


            this.keepInsideViewport();

            this.saveState();
        }


        /*
         * MAXIMALE VIDEOBREEDTE
         */

        limitVideoWidth(width) {

            const minimum = 260;

            const margin = 12;


            const currentLeft =
                Number.isFinite(
                    this.resizeStartLeft
                )
                    ? this.resizeStartLeft
                    : this.el.getBoundingClientRect().left;


            const maximum =
                Math.max(
                    minimum,
                    window.innerWidth -
                    currentLeft -
                    margin
                );


            return Math.round(
                Math.max(
                    minimum,
                    Math.min(
                        width,
                        maximum,
                        900
                    )
                )
            );
        }


        /*
         * MINIMALISEREN
         */

        expand() {

    if (
        !this.el.classList.contains(
            'is-minimized'
        )
    ) {
        return;
    }

    /*
     * Eerst maximaliseren zodat de popup
     * zijn echte afmetingen krijgt.
     */

    this.el.classList.remove(
        'is-minimized'
    );

    /*
     * Altijd exact in het midden.
     */

    const windowRect =
        this.window.getBoundingClientRect();

    const left =
        (window.innerWidth -
            windowRect.width) / 2;

    const top =
        (window.innerHeight -
            windowRect.height) / 2;

    this.setPosition(
        left,
        top
    );

    this.keepInsideViewport();

    this.saveState();
}


        /*
         * OPENEN
         */

        expand() {

            if (
                !this.el.classList.contains(
                    'is-minimized'
                )
            ) {
                return;
            }


            const pillRect =
                this.pill.getBoundingClientRect();


            const centerX =
                pillRect.left +
                pillRect.width / 2;

            const centerY =
                pillRect.top +
                pillRect.height / 2;


            const rightSide =
                centerX >
                window.innerWidth / 2;

            const bottomSide =
                centerY >
                window.innerHeight / 2;


            /*
             * Eerst popup zichtbaar maken
             * zodat we zijn echte grootte kennen.
             */

            this.el.classList.remove(
                'is-minimized'
            );


            const windowRect =
                this.window.getBoundingClientRect();


            /*
             * Popup opent vanuit dezelfde hoek
             * als waar de pill stond.
             */

            const left =
                rightSide
                    ? pillRect.right -
                      windowRect.width
                    : pillRect.left;


            const top =
                bottomSide
                    ? pillRect.bottom -
                      windowRect.height
                    : pillRect.top;


            this.setPosition(
                left,
                top
            );


            this.keepInsideViewport();

            this.saveState();
        }
    }


    /*
     * WORKSHOP FORMULIER
     */

    function setupBookingForm(widget) {

        const form =
            widget.querySelector(
                '.booking-form'
            );

        const feedback =
            widget.querySelector(
                '.booking-feedback'
            );

        const copyButton =
            widget.querySelector(
                '.booking-copy-btn'
            );

        const resetButton =
            widget.querySelector(
                '.booking-reset-btn'
            );

        const moreInfoButton =
            widget.querySelector(
                '.booking-more-info-btn'
            );


        let lastBookingText = '';


        /*
         * MEER INFORMATIE
         */

        if (moreInfoButton) {

            const path =
                window.location.pathname
                    .toLowerCase();


            if (
                path.endsWith('/workshop') ||
                path.endsWith('/workshop.html')
            ) {

                moreInfoButton.addEventListener(
                    'click',
                    (event) => {

                        const infoLink =
                            document.querySelector(
                                '#info-link a'
                            );

                        const infoColumn =
                            document.querySelector(
                                '.column-info'
                            );


                        if (infoLink) {

                            event.preventDefault();

                            infoLink.click();

                        } else if (infoColumn) {

                            event.preventDefault();

                            infoColumn.scrollIntoView({
                                behavior: 'smooth'
                            });
                        }
                    }
                );
            }
        }


        if (!form) {
            return;
        }


        /*
         * FORMULIER VERSTUREN
         */

        form.addEventListener(
            'submit',
            (event) => {

                event.preventDefault();


                const value =
                    (selector) => {

                        const field =
                            form.querySelector(
                                selector
                            );

                        return field
                            ? field.value.trim()
                            : '';
                    };


                const name =
                    value('#booking-name');

                const email =
                    value('#booking-email');

                const phone =
                    value('#booking-phone');

                const date =
                    value('#booking-date');

                const participants =
                    value(
                        '#booking-participants'
                    );


                const typeField =
                    form.querySelector(
                        '#booking-type'
                    );


                const groupType =
                    typeField
                        ? typeField.value
                        : '';


                const message =
                    value('#booking-message');


                /*
                 * Naam en e-mail verplicht.
                 */

                if (
                    !name ||
                    !email
                ) {

                    alert(
                        'Vul alstublieft minimaal je naam en e-mailadres in.'
                    );

                    return;
                }


                /*
                 * Aanvraagtekst maken.
                 */

                lastBookingText = [

                    'Beste Franco,',

                    '',

                    "Graag wil ik een aanvraag doen voor de Mobiele Workshop 'Wat wil jij schreeuwen tegen de wereld?'.",

                    '',

                    'Aanvraaggegevens:',

                    '- Naam: ' +
                        name,

                    '- E-mail: ' +
                        email,

                    '- Telefoonnummer: ' +
                        (
                            phone ||
                            'Niet opgegeven'
                        ),

                    '- Gewenste datum / periode: ' +
                        (
                            date ||
                            'In overleg'
                        ),

                    '- Aantal deelnemers: ' +
                        (
                            participants ||
                            'Niet opgegeven'
                        ),

                    '- Type groep / context: ' +
                        (
                            groupType ||
                            'Niet gespecificeerd'
                        ),

                    '',

                    'Opmerkingen / wensen:',

                    message ||
                        'Geen extra opmerkingen gegeven.',

                    '',

                    'Met vriendelijke groet,',

                    name

                ].join('\n');


                const subject =
                    encodeURIComponent(
                        'Aanvraag Mobiele Workshop - ' +
                        name
                    );


                const body =
                    encodeURIComponent(
                        lastBookingText
                    );


                /*
                 * E-mailprogramma openen.
                 */

                window.location.href =
                    'mailto:francosoolsma@gmail.com' +
                    '?subject=' +
                    subject +
                    '&body=' +
                    body;


                /*
                 * Bevestiging tonen.
                 */

                if (feedback) {

                    feedback.classList.add(
                        'show'
                    );


                    const summary =
                        feedback.querySelector(
                            '.booking-feedback-summary'
                        );


                    if (summary) {

                        summary.textContent =
                            'Aanvraag voor ' +
                            name +
                            ' (' +
                            email +
                            ') klaargezet in je e-mailprogramma.';
                    }
                }
            }
        );


        /*
         * AANVRAAG KOPIËREN
         */

        if (copyButton) {

            copyButton.addEventListener(
                'click',
                async () => {

                    if (!lastBookingText) {
                        return;
                    }


                    try {

                        await navigator.clipboard.writeText(
                            lastBookingText
                        );


                        const oldText =
                            copyButton.textContent;


                        copyButton.textContent =
                            '✓ Gekopieerd!';


                        setTimeout(() => {

                            copyButton.textContent =
                                oldText;

                        }, 2200);


                    } catch (error) {

                        alert(
                            'Kopiëren is niet gelukt. Kopieer de aanvraagtekst handmatig.'
                        );
                    }
                }
            );
        }


        /*
         * NIEUWE AANVRAAG
         */

        if (resetButton) {

            resetButton.addEventListener(
                'click',
                () => {

                    form.reset();


                    if (feedback) {

                        feedback.classList.remove(
                            'show'
                        );
                    }


                    lastBookingText = '';
                }
            );
        }
    }


    /*
     * ALLES INITIALISEREN
     */

    function init() {

        const video =
            document.getElementById(
                'floating-video-widget'
            );


        const booking =
            document.getElementById(
                'floating-booking-widget'
            );


        /*
         * Video
         */

        if (video) {

            new FloatingWidget(video);
        }


        /*
         * Workshop
         */

        if (booking) {

            new FloatingWidget(booking);

            setupBookingForm(
                booking
            );
        }
    }


    /*
     * Wachten tot HTML klaar is.
     */

    if (
        document.readyState ===
        'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            init
        );

    } else {

        init();
    }

})();
