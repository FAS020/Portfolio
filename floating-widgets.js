/**
 * Draggable Floating Widgets
 * Video Window & Workshop Booking Popup
 * Franco Soolsma Portfolio
 *
 * - Viewport-safe positioning
 * - Persistent position/state
 * - Minimized state survives page changes/reloads
 * - First visit starts centered
 * - Minimized pill always stays fully inside viewport
 */

(function () {

    class DraggableWidget {

        constructor(widgetEl) {

            this.widget = widgetEl;

            this.windowEl = widgetEl.querySelector('.floating-window');
            this.headerEl = widgetEl.querySelector('.floating-header');
            this.minPillEl = widgetEl.querySelector('.floating-min-pill');
            this.closeBtn = widgetEl.querySelector('.floating-btn-close');
            this.shield = widgetEl.querySelector('.floating-drag-shield');
            this.resizeBr = widgetEl.querySelector('.floating-resize-br');

            this.isDragging = false;
            this.isResizing = false;
            this.hasMoved = false;

            this.startX = 0;
            this.startY = 0;

            this.initialLeft = 0;
            this.initialTop = 0;

            this.startWidth = 0;
            this.startHeight = 0;

            this.startLeft = 0;

            this.dragTarget = null;
            this.currentPointerId = null;

            /*
             * Every widget gets its own localStorage keys.
             */
            this.storagePrefix = `floatingWidget_${this.widget.id}`;

            this.positionKey = `${this.storagePrefix}_position`;
            this.minimizedKey = `${this.storagePrefix}_minimized`;
            this.seenKey = `${this.storagePrefix}_seen`;

            this.onPointerMove = this.onPointerMove.bind(this);
            this.onPointerUp = this.onPointerUp.bind(this);

            this.init();
        }


        /* ============================================================
           INITIALIZATION
        ============================================================ */

        init() {

            if (!this.widget) return;

            /*
             * First let the browser calculate the actual dimensions.
             */
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.restoreState();
                });
            });


            /*
             * Header dragging.
             */
            if (this.headerEl) {

                this.headerEl.addEventListener('pointerdown', (e) => {

                    /*
                     * Never drag when clicking a control/button.
                     */
                    if (
                        e.target.closest('.floating-controls') ||
                        e.target.closest('button')
                    ) {
                        return;
                    }

                    /*
                     * Do not drag while minimized.
                     */
                    if (this.widget.classList.contains('is-minimized')) {
                        return;
                    }

                    this.startDrag(e);
                });
            }


            /*
             * Minimized pill:
             *
             * IMPORTANT:
             * The pill is NOT draggable.
             *
             * This prevents a click from accidentally moving the pill
             * outside the viewport.
             */
            if (this.minPillEl) {

                this.minPillEl.addEventListener('click', (e) => {

                    e.preventDefault();
                    e.stopPropagation();

                    this.expand();
                });
            }


            /*
             * Minimize button.
             */
            if (this.closeBtn) {

                this.closeBtn.addEventListener('click', (e) => {

                    e.preventDefault();
                    e.stopPropagation();

                    this.minimize();
                });
            }


            /*
             * Video resize handle.
             */
            if (this.resizeBr) {

                this.resizeBr.addEventListener('pointerdown', (e) => {

                    this.startResize(e);
                });
            }


            /*
             * Keep widget inside viewport when browser changes size.
             */
            window.addEventListener('resize', () => {

                requestAnimationFrame(() => {

                    if (this.widget.classList.contains('is-minimized')) {

                        /*
                         * A minimized pill always returns to the
                         * bottom-right safe position.
                         */
                        this.positionMinimizedPill();

                    } else {

                        this.clampPosition();
                        this.savePosition();
                    }
                });
            });
        }


        /* ============================================================
           STORAGE
        ============================================================ */

        savePosition() {

            const rect = this.widget.getBoundingClientRect();

            const position = {
                left: rect.left,
                top: rect.top
            };

            try {

                localStorage.setItem(
                    this.positionKey,
                    JSON.stringify(position)
                );

            } catch (err) {

                console.warn(
                    'Floating widget: kon positie niet opslaan.',
                    err
                );
            }
        }


        getStoredPosition() {

            try {

                const stored = localStorage.getItem(this.positionKey);

                if (!stored) {
                    return null;
                }

                const position = JSON.parse(stored);

                if (
                    typeof position.left !== 'number' ||
                    typeof position.top !== 'number'
                ) {
                    return null;
                }

                return position;

            } catch (err) {

                return null;
            }
        }


        saveMinimizedState(isMinimized) {

            try {

                localStorage.setItem(
                    this.minimizedKey,
                    isMinimized ? 'true' : 'false'
                );

            } catch (err) {

                console.warn(
                    'Floating widget: minimized state kon niet worden opgeslagen.',
                    err
                );
            }
        }


        getStoredMinimizedState() {

            try {

                return localStorage.getItem(this.minimizedKey) === 'true';

            } catch (err) {

                return false;
            }
        }


        hasBeenSeen() {

            try {

                return localStorage.getItem(this.seenKey) === 'true';

            } catch (err) {

                return false;
            }
        }


        markAsSeen() {

            try {

                localStorage.setItem(this.seenKey, 'true');

            } catch (err) {

                // Ignore storage errors.
            }
        }


        /* ============================================================
           RESTORE STATE
        ============================================================ */

        restoreState() {

            const storedPosition = this.getStoredPosition();
            const storedMinimized = this.getStoredMinimizedState();
            const hasSeen = this.hasBeenSeen();


            /*
             * MINIMIZED
             *
             * We intentionally ignore the stored X/Y here.
             *
             * A minimized widget always belongs in the bottom-right
             * safe viewport area.
             */
            if (storedMinimized) {

                this.widget.classList.add('is-minimized');

                /*
                 * Let CSS/browser update the pill dimensions first.
                 */
                requestAnimationFrame(() => {

                    this.positionMinimizedPill();

                    this.markAsSeen();
                });

                return;
            }


            /*
             * OPEN + PREVIOUS POSITION
             */
            if (storedPosition) {

                this.widget.style.transform = 'none';

                this.widget.style.left = `${storedPosition.left}px`;
                this.widget.style.top = `${storedPosition.top}px`;

                this.widget.style.right = 'auto';
                this.widget.style.bottom = 'auto';

                this.clampPosition();

                this.markAsSeen();

                return;
            }


            /*
             * FIRST VISIT
             *
             * Start centered.
             */
            this.normalizePosition();

            this.markAsSeen();
        }


        /* ============================================================
           INITIAL CENTER POSITION
        ============================================================ */

        normalizePosition() {

            if (!this.windowEl) return;

            /*
             * Make sure we are expanded.
             */
            this.widget.classList.remove('is-minimized');

            const rect = this.windowEl.getBoundingClientRect();

            const width = rect.width || 360;
            const height = rect.height || 240;

            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;

            this.widget.style.transform = 'none';

            this.widget.style.left = `${left}px`;
            this.widget.style.top = `${top}px`;

            this.widget.style.right = 'auto';
            this.widget.style.bottom = 'auto';

            this.clampPosition();

            /*
             * Save the initial centered position.
             */
            this.savePosition();
        }


        /* ============================================================
           DRAGGING
        ============================================================ */

        startDrag(e) {

            if (e.button !== undefined && e.button !== 0) {
                return;
            }

            if (this.widget.classList.contains('is-minimized')) {
                return;
            }

            this.isDragging = true;
            this.hasMoved = false;

            this.dragTarget = 'header';

            this.startX = e.clientX;
            this.startY = e.clientY;

            this.currentPointerId = e.pointerId;

            const rect = this.widget.getBoundingClientRect();

            this.initialLeft = rect.left;
            this.initialTop = rect.top;

            this.widget.classList.add('is-dragging');


            /*
             * Prevent iframe / video / other content from stealing
             * pointer movement during dragging.
             */
            if (this.shield) {
                this.shield.style.display = 'block';
            }


            try {

                if (
                    e.target.setPointerCapture &&
                    e.pointerId !== undefined
                ) {

                    e.target.setPointerCapture(e.pointerId);
                }

            } catch (err) {
                // Ignore pointer capture errors.
            }


            window.addEventListener(
                'pointermove',
                this.onPointerMove,
                { passive: false }
            );

            window.addEventListener(
                'pointerup',
                this.onPointerUp
            );

            window.addEventListener(
                'pointercancel',
                this.onPointerUp
            );

            e.preventDefault();
        }


        onPointerMove(e) {

            if (!this.isDragging) {
                return;
            }

            const dx = e.clientX - this.startX;
            const dy = e.clientY - this.startY;


            /*
             * Ignore tiny movements.
             */
            if (!this.hasMoved && Math.hypot(dx, dy) > 4) {

                this.hasMoved = true;
            }


            if (!this.hasMoved) {
                return;
            }

            e.preventDefault();


            const newLeft = this.initialLeft + dx;
            const newTop = this.initialTop + dy;

            this.applyClampedPosition(
                newLeft,
                newTop
            );
        }


        onPointerUp(e) {

            if (!this.isDragging) {
                return;
            }

            this.isDragging = false;

            this.widget.classList.remove('is-dragging');


            if (this.shield) {
                this.shield.style.display = 'none';
            }


            window.removeEventListener(
                'pointermove',
                this.onPointerMove
            );

            window.removeEventListener(
                'pointerup',
                this.onPointerUp
            );

            window.removeEventListener(
                'pointercancel',
                this.onPointerUp
            );


            try {

                if (
                    e.target &&
                    e.target.releasePointerCapture &&
                    this.currentPointerId !== null
                ) {

                    e.target.releasePointerCapture(
                        this.currentPointerId
                    );
                }

            } catch (err) {
                // Ignore.
            }


            /*
             * Save the final position.
             */
            this.savePosition();

            this.dragTarget = null;
            this.currentPointerId = null;
        }


        /* ============================================================
           RESIZING
        ============================================================ */

        startResize(e) {

            if (e.button !== undefined && e.button !== 0) {
                return;
            }

            if (!this.windowEl) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();


            this.isResizing = true;

            this.startX = e.clientX;
            this.startY = e.clientY;


            const windowRect =
                this.windowEl.getBoundingClientRect();

            const widgetRect =
                this.widget.getBoundingClientRect();


            this.startWidth = windowRect.width;
            this.startHeight = windowRect.height;

            this.startLeft = widgetRect.left;


            this.widget.classList.add('is-resizing');


            if (this.shield) {
                this.shield.style.display = 'block';
            }


            try {

                if (
                    e.target.setPointerCapture &&
                    e.pointerId !== undefined
                ) {

                    e.target.setPointerCapture(e.pointerId);
                }

            } catch (err) {
                // Ignore.
            }


            const onResizeMove = (ev) => {

                if (!this.isResizing) {
                    return;
                }

                ev.preventDefault();


                /*
                 * IMPORTANT:
                 *
                 * Resize grows toward the RIGHT.
                 *
                 * The LEFT edge stays fixed.
                 */
                const dx = ev.clientX - this.startX;

                let newWidth =
                    this.startWidth + dx;


                const minWidth = 260;

                const maxWidth =
                    Math.min(
                        680,
                        window.innerWidth - this.startLeft - 12
                    );


                newWidth = Math.max(
                    minWidth,
                    Math.min(
                        maxWidth,
                        newWidth
                    )
                );


                /*
                 * Keep left edge exactly where it was.
                 */
                this.widget.style.left =
                    `${this.startLeft}px`;


                this.windowEl.style.width =
                    `${newWidth}px`;


                /*
                 * Never let right edge leave viewport.
                 */
                const right =
                    this.startLeft + newWidth;

                if (right > window.innerWidth - 12) {

                    this.windowEl.style.width =
                        `${window.innerWidth - 12 - this.startLeft}px`;
                }
            };


            const onResizeUp = (ev) => {

                this.isResizing = false;

                this.widget.classList.remove('is-resizing');


                if (this.shield) {
                    this.shield.style.display = 'none';
                }


                window.removeEventListener(
                    'pointermove',
                    onResizeMove
                );

                window.removeEventListener(
                    'pointerup',
                    onResizeUp
                );

                window.removeEventListener(
                    'pointercancel',
                    onResizeUp
                );


                try {

                    if (
                        e.target.releasePointerCapture &&
                        e.pointerId !== undefined
                    ) {

                        e.target.releasePointerCapture(
                            e.pointerId
                        );
                    }

                } catch (err) {
                    // Ignore.
                }


                /*
                 * Make absolutely sure the widget is still visible.
                 */
                this.clampPosition();

                this.savePosition();
            };


            window.addEventListener(
                'pointermove',
                onResizeMove,
                { passive: false }
            );

            window.addEventListener(
                'pointerup',
                onResizeUp
            );

            window.addEventListener(
                'pointercancel',
                onResizeUp
            );
        }


        /* ============================================================
           ACTIVE ELEMENT
        ============================================================ */

        getActiveElement() {

            if (
                this.widget.classList.contains(
                    'is-minimized'
                )
            ) {

                return this.minPillEl || this.widget;
            }

            return this.windowEl || this.widget;
        }


        /* ============================================================
           CLAMP OPEN WINDOW
        ============================================================ */

        applyClampedPosition(left, top) {

            const activeEl =
                this.getActiveElement();

            if (!activeEl) {
                return;
            }


            const rect =
                activeEl.getBoundingClientRect();


            const width =
                rect.width ||
                activeEl.offsetWidth ||
                340;

            const height =
                rect.height ||
                activeEl.offsetHeight ||
                220;


            /*
             * Safe viewport margins.
             */
            const marginX = 12;

            const marginTop = 52;

            const marginBottom = 18;


            /*
             * Maximum allowed coordinates.
             */
            const minX = marginX;

            const maxX =
                Math.max(
                    minX,
                    window.innerWidth -
                    width -
                    marginX
                );


            const minY = marginTop;

            const maxY =
                Math.max(
                    minY,
                    window.innerHeight -
                    height -
                    marginBottom
                );


            const clampedLeft =
                Math.max(
                    minX,
                    Math.min(
                        left,
                        maxX
                    )
                );


            const clampedTop =
                Math.max(
                    minY,
                    Math.min(
                        top,
                        maxY
                    )
                );


            this.widget.style.left =
                `${clampedLeft}px`;

            this.widget.style.top =
                `${clampedTop}px`;

            this.widget.style.right = 'auto';
            this.widget.style.bottom = 'auto';

            this.widget.style.transform = 'none';


            /*
             * Set transform origin based on current location.
             */
            const isBottomHalf =
                (
                    clampedTop +
                    height / 2
                ) > (
                    window.innerHeight / 2
                );


            const isRightHalf =
                (
                    clampedLeft +
                    width / 2
                ) > (
                    window.innerWidth / 2
                );


            const originY =
                isBottomHalf
                    ? 'bottom'
                    : 'top';

            const originX =
                isRightHalf
                    ? 'right'
                    : 'left';


            if (this.windowEl) {

                this.windowEl.style.transformOrigin =
                    `${originY} ${originX}`;
            }


            if (this.minPillEl) {

                this.minPillEl.style.transformOrigin =
                    `${originY} ${originX}`;
            }
        }


        clampPosition() {

            const rect =
                this.widget.getBoundingClientRect();


            let currentLeft =
                parseFloat(
                    this.widget.style.left
                );


            let currentTop =
                parseFloat(
                    this.widget.style.top
                );


            /*
             * If no explicit value exists,
             * use the current viewport coordinates.
             */
            if (Number.isNaN(currentLeft)) {
                currentLeft = rect.left;
            }

            if (Number.isNaN(currentTop)) {
                currentTop = rect.top;
            }


            this.applyClampedPosition(
                currentLeft,
                currentTop
            );
        }


        /* ============================================================
           MINIMIZE
        ============================================================ */

        minimize() {

            if (
                this.widget.classList.contains(
                    'is-minimized'
                )
            ) {
                return;
            }


            /*
             * Save the current open position BEFORE minimizing.
             *
             * This means opening later can return to the same
             * general location.
             */
            this.savePosition();


            /*
             * Add minimized class first.
             *
             * The CSS then hides the large window and displays
             * the pill.
             */
            this.widget.classList.add(
                'is-minimized'
            );


            this.saveMinimizedState(true);


            /*
             * Wait until the browser has recalculated the pill's
             * actual dimensions.
             */
            requestAnimationFrame(() => {

                requestAnimationFrame(() => {

                    this.positionMinimizedPill();
                });
            });
        }


        /* ============================================================
           MINIMIZED POSITION
        ============================================================ */

        positionMinimizedPill() {

            if (!this.minPillEl) {
                return;
            }


            /*
             * The pill is now visible.
             */
            this.widget.classList.add(
                'is-minimized'
            );


            /*
             * Get the ACTUAL pill dimensions.
             *
             * This is the important fix.
             *
             * We do NOT calculate using the large window.
             */
            const pillRect =
                this.minPillEl.getBoundingClientRect();


            const pillWidth =
                pillRect.width ||
                this.minPillEl.offsetWidth ||
                170;


            const pillHeight =
                pillRect.height ||
                this.minPillEl.offsetHeight ||
                42;


            /*
             * Safe distance from viewport edges.
             */
            const marginRight = 20;
            const marginBottom = 20;


            /*
             * ALWAYS bottom-right.
             *
             * This means the minimized widget can never
             * disappear somewhere inside/outside a website column.
             */
            let left =
                window.innerWidth -
                pillWidth -
                marginRight;


            let top =
                window.innerHeight -
                pillHeight -
                marginBottom;


            /*
             * Hard safety clamp.
             */
            left = Math.max(
                0,
                Math.min(
                    left,
                    window.innerWidth - pillWidth
                )
            );


            top = Math.max(
                0,
                Math.min(
                    top,
                    window.innerHeight - pillHeight
                )
            );


            /*
             * Explicitly use viewport coordinates.
             */
            this.widget.style.transform = 'none';

            this.widget.style.left =
                `${left}px`;

            this.widget.style.top =
                `${top}px`;

            this.widget.style.right = 'auto';
            this.widget.style.bottom = 'auto';


            /*
             * Save the safe minimized position too.
             */
            this.savePosition();
        }


        /* ============================================================
           EXPAND
        ============================================================ */

        expand() {

            if (
                !this.widget.classList.contains(
                    'is-minimized'
                )
            ) {
                return;
            }


            /*
             * Remember where the pill is BEFORE removing
             * minimized state.
             */
            const pillRect =
                this.minPillEl
                    ? this.minPillEl.getBoundingClientRect()
                    : this.widget.getBoundingClientRect();


            const pillCenterX =
                pillRect.left +
                pillRect.width / 2;

            const pillCenterY =
                pillRect.top +
                pillRect.height / 2;


            /*
             * Remove minimized state.
             */
            this.widget.classList.remove(
                'is-minimized'
            );


            this.saveMinimizedState(false);


            /*
             * Let the large window become measurable.
             */
            requestAnimationFrame(() => {

                const windowRect =
                    this.windowEl
                        ? this.windowEl.getBoundingClientRect()
                        : {
                            width: 360,
                            height: 240
                        };


                const windowWidth =
                    windowRect.width ||
                    360;

                const windowHeight =
                    windowRect.height ||
                    240;


                /*
                 * Decide which corner the pill was closest to.
                 */
                const isRightHalf =
                    pillCenterX >
                    window.innerWidth / 2;


                const isBottomHalf =
                    pillCenterY >
                    window.innerHeight / 2;


                let targetLeft;

                let targetTop;


                /*
                 * Keep the window visually connected to
                 * the minimized pill.
                 */
                if (isRightHalf) {

                    targetLeft =
                        pillRect.right -
                        windowWidth;

                } else {

                    targetLeft =
                        pillRect.left;
                }


                if (isBottomHalf) {

                    targetTop =
                        pillRect.bottom -
                        windowHeight;

                } else {

                    targetTop =
                        pillRect.top;
                }


                this.widget.style.transform = 'none';


                this.applyClampedPosition(
                    targetLeft,
                    targetTop
                );


                /*
                 * Save the newly opened position.
                 */
                this.savePosition();
            });
        }
    }


    /* ================================================================
       INITIALIZE WIDGETS
    ================================================================ */

    document.addEventListener(
        'DOMContentLoaded',
        () => {

            /*
             * VIDEO WIDGET
             */
            const videoWidgetEl =
                document.getElementById(
                    'floating-video-widget'
                );


            if (videoWidgetEl) {

                new DraggableWidget(
                    videoWidgetEl
                );
            }


            /*
             * BOOKING WIDGET
             */
            const bookingWidgetEl =
                document.getElementById(
                    'floating-booking-widget'
                );


            if (bookingWidgetEl) {

                new DraggableWidget(
                    bookingWidgetEl
                );

                setupBookingForm(
                    bookingWidgetEl
                );
            }
        }
    );


    /* ================================================================
       BOOKING FORM
    ================================================================ */

    function setupBookingForm(widgetEl) {

        const form =
            widgetEl.querySelector(
                '.booking-form'
            );


        const feedbackEl =
            widgetEl.querySelector(
                '.booking-feedback'
            );


        const copyBtn =
            widgetEl.querySelector(
                '.booking-copy-btn'
            );


        const resetBtn =
            widgetEl.querySelector(
                '.booking-reset-btn'
            );


        const moreInfoBtn =
            widgetEl.querySelector(
                '.booking-more-info-btn'
            );


        /*
         * "Meer informatie" on workshop page.
         */
        if (
            moreInfoBtn &&
            (
                window.location.pathname.endsWith(
                    'workshop'
                ) ||
                window.location.pathname.endsWith(
                    'workshop.html'
                )
            )
        ) {

            moreInfoBtn.addEventListener(
                'click',
                (e) => {

                    const infoLink =
                        document.querySelector(
                            '#info-link a'
                        );


                    const columnInfo =
                        document.querySelector(
                            '.column-info'
                        );


                    if (infoLink) {

                        e.preventDefault();

                        infoLink.click();

                    } else if (columnInfo) {

                        e.preventDefault();

                        columnInfo.scrollIntoView({
                            behavior: 'smooth'
                        });
                    }
                }
            );
        }


        if (!form) {
            return;
        }


        let lastBookingData = null;


        /*
         * Submit booking form.
         */
        form.addEventListener(
            'submit',
            (e) => {

                e.preventDefault();


                const name =
                    (
                        form.querySelector(
                            '#booking-name'
                        )?.value || ''
                    ).trim();


                const email =
                    (
                        form.querySelector(
                            '#booking-email'
                        )?.value || ''
                    ).trim();


                const phone =
                    (
                        form.querySelector(
                            '#booking-phone'
                        )?.value || ''
                    ).trim();


                const date =
                    (
                        form.querySelector(
                            '#booking-date'
                        )?.value || ''
                    ).trim();


                const participants =
                    (
                        form.querySelector(
                            '#booking-participants'
                        )?.value || ''
                    ).trim();


                const groupType =
                    form.querySelector(
                        '#booking-type'
                    )?.value || '';


                const notes =
                    (
                        form.querySelector(
                            '#booking-message'
                        )?.value || ''
                    ).trim();


                if (!name || !email) {

                    alert(
                        'Vul alstublieft minimaal je naam en e-mailadres in.'
                    );

                    return;
                }


                const formattedDetails = [
                    'Beste Franco,',
                    '',
                    "Graag wil ik een aanvraag doen voor de Mobiele Workshop 'Wat wil jij schreeuwen tegen de wereld?'.",
                    '',
                    'Aanvraaggegevens:',
                    `- Naam: ${name}`,
                    `- E-mail: ${email}`,
                    `- Telefoonnummer: ${phone || 'Niet opgegeven'}`,
                    `- Gewenste datum / periode: ${date || 'In overleg'}`,
                    `- Aantal deelnemers: ${participants || 'Niet opgegeven'}`,
                    `- Type groep / context: ${groupType || 'Niet gespecificeerd'}`,
                    '',
                    'Opmerkingen / wensen:',
                    notes || 'Geen extra opmerkingen gegeven.',
                    '',
                    'Met vriendelijke groet,',
                    name
                ].join('\n');


                lastBookingData =
                    formattedDetails;


                const mailSubject =
                    encodeURIComponent(
                        `Aanvraag Mobiele Workshop - ${name}`
                    );


                const mailBody =
                    encodeURIComponent(
                        formattedDetails
                    );


                const mailtoUri =
                    `mailto:francosoolsma@gmail.com?subject=${mailSubject}&body=${mailBody}`;


                /*
                 * Open mail client.
                 */
                window.location.href =
                    mailtoUri;


                /*
                 * Feedback.
                 */
                if (feedbackEl) {

                    feedbackEl.classList.add(
                        'show'
                    );


                    const feedbackSummary =
                        feedbackEl.querySelector(
                            '.booking-feedback-summary'
                        );


                    if (feedbackSummary) {

                        feedbackSummary.textContent =
                            `Aanvraag voor ${name} (${email}) klaargezet in je e-mailprogramma.`;
                    }
                }
            }
        );


        /*
         * Copy booking text.
         */
        if (copyBtn) {

            copyBtn.addEventListener(
                'click',
                () => {

                    if (!lastBookingData) {
                        return;
                    }


                    navigator.clipboard
                        .writeText(
                            lastBookingData
                        )
                        .then(() => {

                            const originalText =
                                copyBtn.textContent;


                            copyBtn.textContent =
                                '✓ Gekopieerd!';


                            setTimeout(() => {

                                copyBtn.textContent =
                                    originalText;

                            }, 2200);

                        })
                        .catch(() => {

                            alert(
                                'Kon tekst niet automatisch kopiëren. Selecteer en kopieer handmatig.'
                            );
                        });
                }
            );
        }


        /*
         * Reset booking form.
         */
        if (resetBtn) {

            resetBtn.addEventListener(
                'click',
                () => {

                    form.reset();


                    if (feedbackEl) {

                        feedbackEl.classList.remove(
                            'show'
                        );
                    }
                }
            );
        }
    }

})();
