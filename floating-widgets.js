/**
 * Floating Widgets
 * Franco Soolsma Portfolio
 *
 * - Draggable video widget
 * - Draggable workshop booking widget
 * - Persistent minimized state
 * - Persistent position
 * - Animated minimize / expand
 * - Video resize grows to the RIGHT
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
            this.startLeft = 0;
            this.startTop = 0;

            this.dragTarget = null;

            this.currentPointerId = null;

            this.animationDuration = 300;

            this.onPointerMove = this.onPointerMove.bind(this);
            this.onPointerUp = this.onPointerUp.bind(this);

            this.init();
        }


        /* ================================================================
           STORAGE
           ================================================================ */

        getStorageKey(type) {

            return `floatingWidget_${this.widget.id}_${type}`;
        }


        getStoredPosition() {

            try {

                const raw = localStorage.getItem(
                    this.getStorageKey('position')
                );

                if (!raw) return null;

                const data = JSON.parse(raw);

                if (
                    typeof data.left !== 'number' ||
                    typeof data.top !== 'number'
                ) {
                    return null;
                }

                return data;

            } catch (error) {

                return null;
            }
        }


        savePosition() {

            if (this.widget.classList.contains('is-minimized')) {
                return;
            }

            const left = parseFloat(this.widget.style.left);
            const top = parseFloat(this.widget.style.top);

            if (!Number.isFinite(left) || !Number.isFinite(top)) {
                return;
            }

            try {

                localStorage.setItem(
                    this.getStorageKey('position'),
                    JSON.stringify({
                        left: left,
                        top: top
                    })
                );

            } catch (error) {
                // localStorage unavailable; ignore.
            }
        }


        isStoredMinimized() {

            try {

                return (
                    localStorage.getItem(
                        this.getStorageKey('minimized')
                    ) === 'true'
                );

            } catch (error) {

                return false;
            }
        }


        setStoredMinimized(value) {

            try {

                localStorage.setItem(
                    this.getStorageKey('minimized'),
                    value ? 'true' : 'false'
                );

            } catch (error) {
                // Ignore storage errors.
            }
        }


        hasBeenSeen() {

            try {

                return (
                    localStorage.getItem(
                        this.getStorageKey('seen')
                    ) === 'true'
                );

            } catch (error) {

                return false;
            }
        }


        setSeen() {

            try {

                localStorage.setItem(
                    this.getStorageKey('seen'),
                    'true'
                );

            } catch (error) {
                // Ignore storage errors.
            }
        }


        /* ================================================================
           INITIALIZATION
           ================================================================ */

        init() {

            if (!this.widget || !this.windowEl) {
                return;
            }

            /*
             * Wait until the browser has calculated the real dimensions.
             */
            requestAnimationFrame(() => {

                const storedMinimized = this.isStoredMinimized();
                const storedPosition = this.getStoredPosition();
                const seen = this.hasBeenSeen();

                if (storedMinimized) {

                    /*
                     * Returning visitor who previously minimized it.
                     */
                    this.setInitialMinimizedPosition();

                    this.widget.classList.add('is-minimized');

                    this.setStoredMinimized(true);

                } else if (storedPosition) {

                    /*
                     * Returning visitor who had the popup open.
                     */
                    this.widget.style.transform = 'none';

                    this.applyClampedPosition(
                        storedPosition.left,
                        storedPosition.top
                    );

                    this.widget.classList.add('is-ready');

                } else {

                    /*
                     * First visit:
                     * center the popup.
                     */
                    this.normalizePosition();

                    this.widget.classList.add('is-first-open');

                    this.setSeen();

                    /*
                     * Remove entrance class after animation.
                     */
                    setTimeout(() => {

                        this.widget.classList.remove('is-first-open');

                    }, 500);
                }

            });


            /* ============================================================
               HEADER DRAG
               ============================================================ */

            if (this.headerEl) {

                this.headerEl.addEventListener(
                    'pointerdown',
                    (e) => {

                        /*
                         * Do not start dragging when clicking
                         * the minimize button.
                         */
                        if (
                            e.target.closest('.floating-controls') ||
                            e.target.closest('button')
                        ) {
                            return;
                        }

                        this.startDrag(e);
                    }
                );
            }


            /* ============================================================
               MINIMIZED PILL
               ============================================================ */

            if (this.minPillEl) {

                /*
                 * The pill is now a simple OPEN button.
                 *
                 * We deliberately don't drag the pill.
                 * This prevents accidental dragging/clicking conflicts.
                 */
                this.minPillEl.addEventListener(
                    'click',
                    (e) => {

                        e.preventDefault();
                        e.stopPropagation();

                        this.expand();
                    }
                );
            }


            /* ============================================================
               MINIMIZE BUTTON
               ============================================================ */

            if (this.closeBtn) {

                this.closeBtn.addEventListener(
                    'click',
                    (e) => {

                        e.preventDefault();
                        e.stopPropagation();

                        this.minimize();
                    }
                );
            }


            /* ============================================================
               VIDEO RESIZE
               ============================================================ */

            if (this.resizeBr) {

                this.resizeBr.addEventListener(
                    'pointerdown',
                    (e) => {

                        this.startResize(e);
                    }
                );
            }


            /* ============================================================
               WINDOW RESIZE
               ============================================================ */

            window.addEventListener(
                'resize',
                () => {

                    if (
                        this.widget.classList.contains(
                            'is-minimized'
                        )
                    ) {

                        this.setInitialMinimizedPosition();

                    } else {

                        this.clampPosition();
                    }
                }
            );
        }


        /* ================================================================
           INITIAL CENTER POSITION
           ================================================================ */

        normalizePosition() {

            if (!this.windowEl) return;

            const width = this.windowEl.offsetWidth || 360;
            const height = this.windowEl.offsetHeight || 240;

            const centerX = Math.max(
                12,
                Math.round(
                    (window.innerWidth - width) / 2
                )
            );

            const centerY = Math.max(
                52,
                Math.round(
                    (window.innerHeight - height) / 2
                )
            );

            this.widget.style.transform = 'none';

            this.widget.style.left = `${centerX}px`;
            this.widget.style.top = `${centerY}px`;

            this.widget.style.right = 'auto';
            this.widget.style.bottom = 'auto';

            this.applyClampedPosition(
                centerX,
                centerY
            );
        }


        /* ================================================================
           DRAGGING
           ================================================================ */

        startDrag(e) {

            if (
                e.button !== undefined &&
                e.button !== 0
            ) {
                return;
            }

            if (
                this.isResizing ||
                this.isDragging
            ) {
                return;
            }

            this.isDragging = true;
            this.hasMoved = false;

            this.dragTarget = 'header';

            this.startX = e.clientX;
            this.startY = e.clientY;

            this.currentPointerId = e.pointerId;

            const rect =
                this.widget.getBoundingClientRect();

            this.initialLeft = rect.left;
            this.initialTop = rect.top;

            /*
             * Disable position animation while dragging.
             */
            this.widget.classList.add('is-dragging');

            if (this.shield) {

                this.shield.style.display = 'block';
            }

            try {

                if (
                    e.currentTarget &&
                    e.currentTarget.setPointerCapture &&
                    e.pointerId !== undefined
                ) {

                    e.currentTarget.setPointerCapture(
                        e.pointerId
                    );
                }

            } catch (error) {
                // Ignore.
            }

            window.addEventListener(
                'pointermove',
                this.onPointerMove,
                {
                    passive: false
                }
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

            const dx =
                e.clientX - this.startX;

            const dy =
                e.clientY - this.startY;


            /*
             * Ignore tiny movements.
             */
            if (
                !this.hasMoved &&
                Math.hypot(dx, dy) > 4
            ) {

                this.hasMoved = true;
            }


            if (!this.hasMoved) {
                return;
            }


            e.preventDefault();


            const newLeft =
                this.initialLeft + dx;

            const newTop =
                this.initialTop + dy;


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

            this.widget.classList.remove(
                'is-dragging'
            );


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

            } catch (error) {
                // Ignore.
            }


            /*
             * Save the new position.
             */
            if (this.hasMoved) {

                this.savePosition();
            }


            this.currentPointerId = null;
            this.dragTarget = null;
        }


        /* ================================================================
           VIDEO RESIZE
           ================================================================ */

        startResize(e) {

            if (
                e.button !== undefined &&
                e.button !== 0
            ) {
                return;
            }

            if (
                this.isDragging ||
                this.isResizing
            ) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();


            this.isResizing = true;

            this.startX = e.clientX;
            this.startY = e.clientY;


            const widgetRect =
                this.widget.getBoundingClientRect();

            const windowRect =
                this.windowEl.getBoundingClientRect();


            this.startWidth =
                windowRect.width;

            this.startLeft =
                widgetRect.left;

            this.startTop =
                widgetRect.top;


            /*
             * Important:
             *
             * The LEFT edge stays fixed.
             * The RIGHT edge follows the mouse.
             *
             * This means the window grows to the RIGHT,
             * not to the LEFT.
             */

            this.widget.classList.add(
                'is-resizing'
            );


            if (this.shield) {

                this.shield.style.display = 'block';
            }


            try {

                if (
                    e.currentTarget &&
                    e.currentTarget.setPointerCapture &&
                    e.pointerId !== undefined
                ) {

                    e.currentTarget.setPointerCapture(
                        e.pointerId
                    );
                }

            } catch (error) {
                // Ignore.
            }


            const onResizeMove = (ev) => {

                if (!this.isResizing) {
                    return;
                }

                ev.preventDefault();


                /*
                 * Positive movement to the RIGHT
                 * increases width.
                 */
                const dx =
                    ev.clientX - this.startX;


                /*
                 * Keep the video 16:9.
                 *
                 * Width is the primary resize dimension.
                 */
                const minW = 260;

                const maxW =
                    Math.min(
                        800,
                        window.innerWidth -
                        this.startLeft -
                        12
                    );


                let newWidth =
                    this.startWidth + dx;


                newWidth =
                    Math.max(
                        minW,
                        Math.min(
                            maxW,
                            newWidth
                        )
                    );


                this.windowEl.style.width =
                    `${newWidth}px`;


                /*
                 * LEFT DOES NOT MOVE.
                 */
                this.widget.style.left =
                    `${this.startLeft}px`;

                this.widget.style.top =
                    `${this.startTop}px`;
            };


            const onResizeUp = (ev) => {

                this.isResizing = false;

                this.widget.classList.remove(
                    'is-resizing'
                );


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
                        e.currentTarget &&
                        e.currentTarget.releasePointerCapture &&
                        e.pointerId !== undefined
                    ) {

                        e.currentTarget.releasePointerCapture(
                            e.pointerId
                        );
                    }

                } catch (error) {
                    // Ignore.
                }


                this.savePosition();
            };


            window.addEventListener(
                'pointermove',
                onResizeMove,
                {
                    passive: false
                }
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


        /* ================================================================
           ACTIVE ELEMENT
           ================================================================ */

        getActiveElement() {

            if (
                this.widget.classList.contains(
                    'is-minimized'
                )
            ) {

                return (
                    this.minPillEl ||
                    this.widget
                );
            }

            return (
                this.windowEl ||
                this.widget
            );
        }


        /* ================================================================
           CLAMP POSITION
           ================================================================ */

        applyClampedPosition(left, top) {

            const activeEl =
                this.getActiveElement();

            const width =
                activeEl.offsetWidth ||
                340;

            const height =
                activeEl.offsetHeight ||
                220;


            const marginX = 12;
            const marginTop = 52;
            const marginBottom = 18;


            const minX =
                marginX;

            const maxX =
                Math.max(
                    marginX,
                    window.innerWidth -
                    width -
                    marginX
                );


            const minY =
                marginTop;

            const maxY =
                Math.max(
                    marginTop,
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

            this.widget.style.right =
                'auto';

            this.widget.style.bottom =
                'auto';
        }


        clampPosition() {

            const rect =
                this.widget.getBoundingClientRect();


            const currentLeft =
                parseFloat(
                    this.widget.style.left
                );

            const currentTop =
                parseFloat(
                    this.widget.style.top
                );


            this.applyClampedPosition(
                Number.isFinite(currentLeft)
                    ? currentLeft
                    : rect.left,

                Number.isFinite(currentTop)
                    ? currentTop
                    : rect.top
            );
        }


        /* ================================================================
           MINIMIZED POSITION
           ================================================================ */

        setInitialMinimizedPosition() {

            if (!this.minPillEl) {
                return;
            }


            /*
             * Temporarily make the pill measurable.
             */
            const wasMinimized =
                this.widget.classList.contains(
                    'is-minimized'
                );


            if (!wasMinimized) {

                this.widget.classList.add(
                    'is-minimized'
                );
            }


            const pillWidth =
                this.minPillEl.offsetWidth ||
                220;

            const pillHeight =
                this.minPillEl.offsetHeight ||
                40;


            const rightMargin = 18;
            const bottomMargin = 18;


            const left =
                window.innerWidth -
                pillWidth -
                rightMargin;


            const top =
                window.innerHeight -
                pillHeight -
                bottomMargin;


            /*
             * No transform here.
             * This keeps the pill stable.
             */
            this.widget.style.transform =
                'none';


            this.widget.style.left =
                `${Math.max(12, left)}px`;

            this.widget.style.top =
                `${Math.max(52, top)}px`;

            this.widget.style.right =
                'auto';

            this.widget.style.bottom =
                'auto';
        }


        /* ================================================================
           MINIMIZE
           ================================================================ */

        minimize() {

            if (
                this.widget.classList.contains(
                    'is-minimized'
                ) ||
                this.widget.classList.contains(
                    'is-minimizing'
                )
            ) {
                return;
            }


            const windowRect =
                this.windowEl.getBoundingClientRect();


            /*
             * Determine bottom-right target.
             */
            const pillWidth =
                this.minPillEl?.offsetWidth ||
                220;

            const pillHeight =
                this.minPillEl?.offsetHeight ||
                40;


            const targetLeft =
                window.innerWidth -
                pillWidth -
                18;


            const targetTop =
                window.innerHeight -
                pillHeight -
                18;


            /*
             * Remember current location.
             */
            this.savePosition();


            this.setStoredMinimized(true);


            /*
             * Enable position transition.
             */
            this.widget.classList.add(
                'is-transitioning'
            );


            /*
             * Start minimize animation.
             */
            this.widget.classList.add(
                'is-minimizing'
            );


            /*
             * Move toward bottom-right.
             */
            this.widget.style.left =
                `${Math.max(12, targetLeft)}px`;

            this.widget.style.top =
                `${Math.max(52, targetTop)}px`;


            /*
             * Switch actual state after
             * the animation has progressed.
             */
            setTimeout(() => {

                this.widget.classList.remove(
                    'is-minimizing'
                );

                this.widget.classList.add(
                    'is-minimized'
                );

            }, 30);


            /*
             * Finish transition.
             */
            setTimeout(() => {

                this.widget.classList.remove(
                    'is-transitioning'
                );

                this.setInitialMinimizedPosition();

            }, this.animationDuration + 20);
        }


        /* ================================================================
           EXPAND
           ================================================================ */

        expand() {

            if (
                !this.widget.classList.contains(
                    'is-minimized'
                )
            ) {
                return;
            }


            /*
             * Get pill position before removing minimized state.
             */
            const pillRect =
                this.minPillEl.getBoundingClientRect();


            const windowWidth =
                this.windowEl.offsetWidth ||
                360;

            const windowHeight =
                this.windowEl.offsetHeight ||
                240;


            /*
             * Determine whether popup should grow
             * upward or downward and left/right.
             */
            const isBottomHalf =
                pillRect.top +
                pillRect.height / 2 >
                window.innerHeight / 2;


            const isRightHalf =
                pillRect.left +
                pillRect.width / 2 >
                window.innerWidth / 2;


            const targetLeft =
                isRightHalf
                    ? pillRect.right -
                      windowWidth
                    : pillRect.left;


            const targetTop =
                isBottomHalf
                    ? pillRect.bottom -
                      windowHeight
                    : pillRect.top;


            /*
             * Remove minimized state.
             */
            this.widget.classList.remove(
                'is-minimized'
            );


            /*
             * Tell storage it is open again.
             */
            this.setStoredMinimized(false);


            /*
             * Enable movement transition.
             */
            this.widget.classList.add(
                'is-transitioning'
            );


            this.widget.classList.add(
                'is-expanding'
            );


            /*
             * Set target position.
             */
            this.applyClampedPosition(
                targetLeft,
                targetTop
            );


            /*
             * Finish animation.
             */
            setTimeout(() => {

                this.widget.classList.remove(
                    'is-expanding'
                );

                this.widget.classList.remove(
                    'is-transitioning'
                );

                this.savePosition();

            }, this.animationDuration + 20);
        }
    }


    /* =====================================================================
       INITIALIZE
       ===================================================================== */

    document.addEventListener(
        'DOMContentLoaded',
        () => {

            const videoWidgetEl =
                document.getElementById(
                    'floating-video-widget'
                );


            if (videoWidgetEl) {

                new DraggableWidget(
                    videoWidgetEl
                );
            }


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


    /* =====================================================================
       BOOKING FORM
       ===================================================================== */

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
         * Workshop info link.
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
                    `Beste Franco,`,
                    ``,
                    `Graag wil ik een aanvraag doen voor de Mobiele Workshop 'Wat wil jij schreeuwen tegen de wereld?'.`,
                    ``,
                    `Aanvraaggegevens:`,
                    `- Naam: ${name}`,
                    `- E-mail: ${email}`,
                    `- Telefoonnummer: ${phone || 'Niet opgegeven'}`,
                    `- Gewenste datum / periode: ${date || 'In overleg'}`,
                    `- Aantal deelnemers: ${participants || 'Niet opgegeven'}`,
                    `- Type groep / context: ${groupType || 'Niet gespecificeerd'}`,
                    ``,
                    `Opmerkingen / wensen:`,
                    notes || 'Geen extra opmerkingen gegeven.',
                    ``,
                    `Met vriendelijke groet,`,
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


                window.location.href =
                    mailtoUri;


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


        /* Copy */
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


        /* Reset */
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
