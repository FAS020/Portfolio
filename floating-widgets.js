/**
 * Draggable Floating Widgets
 * Video Window & Workshop Booking Popup
 * Franco Soolsma Portfolio
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
            this.startRight = 0;

            this.dragTarget = null;
            this.currentPointerId = null;

            this.onPointerMove = this.onPointerMove.bind(this);
            this.onPointerUp = this.onPointerUp.bind(this);

            this.init();
        }


        /* =========================================================
           STORAGE
        ========================================================= */

        getStorageKey(type) {

            return `floatingWidget_${this.widget.id}_${type}`;

        }


        /* =========================================================
           INITIALIZATION
        ========================================================= */

        init() {

            if (!this.widget) return;


            /*
             * Check whether this widget has been shown before.
             *
             * First visit:
             *     Show the popup in the center.
             *
             * Returning visitor:
             *     Restore minimized/open state.
             */

            setTimeout(() => {

                const wasSeen =
                    localStorage.getItem(
                        this.getStorageKey('seen')
                    );

                const wasMinimized =
                    localStorage.getItem(
                        this.getStorageKey('minimized')
                    ) === 'true';


                if (!wasSeen) {

                    // First visit
                    this.normalizePosition();

                    localStorage.setItem(
                        this.getStorageKey('seen'),
                        'true'
                    );

                } else if (wasMinimized) {

                    // User previously minimized it
                    this.restoreMinimizedPosition();

                } else {

                    // User previously left it open
                    this.normalizePosition();

                }

            }, 60);


            /* =====================================================
               HEADER DRAGGING
            ===================================================== */

            if (this.headerEl) {

                this.headerEl.addEventListener(
                    'pointerdown',
                    (e) => {

                        /*
                         * Don't start dragging when clicking
                         * the buttons inside the header.
                         */

                        if (
                            e.target.closest('.floating-controls') ||
                            e.target.closest('button')
                        ) {
                            return;
                        }

                        this.startDrag(e, 'header');

                    }
                );

            }


            /* =====================================================
               MINIMIZED PILL DRAGGING
            ===================================================== */

            if (this.minPillEl) {

                this.minPillEl.addEventListener(
                    'pointerdown',
                    (e) => {

                        this.startDrag(e, 'pill');

                    }
                );

            }


            /* =====================================================
               MINIMIZE BUTTON
            ===================================================== */

            if (this.closeBtn) {

                this.closeBtn.addEventListener(
                    'click',
                    (e) => {

                        e.stopPropagation();

                        this.minimize();

                    }
                );

            }


            /* =====================================================
               RESIZE HANDLE
            ===================================================== */

            if (this.resizeBr) {

                this.resizeBr.addEventListener(
                    'pointerdown',
                    (e) => {

                        this.startResize(e);

                    }
                );

            }


            /* =====================================================
               WINDOW RESIZE
            ===================================================== */

            window.addEventListener(
                'resize',
                () => {

                    /*
                     * If minimized, always keep the pill
                     * in the bottom-right corner.
                     */

                    if (
                        this.widget.classList.contains(
                            'is-minimized'
                        )
                    ) {

                        this.restoreMinimizedPosition();

                    } else {

                        this.clampPosition();

                    }

                }
            );

        }


        /* =========================================================
           NORMAL / CENTER POSITION
        ========================================================= */

        normalizePosition() {

            const width =
                this.windowEl
                    ? this.windowEl.offsetWidth
                    : (this.widget.offsetWidth || 380);

            const height =
                this.windowEl
                    ? this.windowEl.offsetHeight
                    : (this.widget.offsetHeight || 300);


            const centerX =
                Math.max(
                    12,
                    Math.round(
                        (window.innerWidth - width) / 2
                    )
                );


            const centerY =
                Math.max(
                    52,
                    Math.round(
                        (window.innerHeight - height) / 2
                    )
                );


            this.widget.style.transform = 'none';

            this.widget.style.left =
                `${centerX}px`;

            this.widget.style.top =
                `${centerY}px`;

            this.widget.style.right = 'auto';
            this.widget.style.bottom = 'auto';


            this.clampPosition();

        }


        /* =========================================================
           RESTORE MINIMIZED POSITION
        ========================================================= */

        restoreMinimizedPosition() {

            const pillWidth =
                this.minPillEl
                    ? (this.minPillEl.offsetWidth || 170)
                    : 170;


            const pillHeight =
                this.minPillEl
                    ? (this.minPillEl.offsetHeight || 42)
                    : 42;


            const marginRight = 18;
            const marginBottom = 18;


            const targetLeft =
                window.innerWidth -
                pillWidth -
                marginRight;


            const targetTop =
                window.innerHeight -
                pillHeight -
                marginBottom;


            this.widget.classList.add(
                'is-minimized'
            );


            this.applyClampedPosition(
                targetLeft,
                targetTop
            );

        }


        /* =========================================================
           DRAG START
        ========================================================= */

        startDrag(e, targetType) {

            /*
             * Only primary mouse button or touch.
             */

            if (
                e.button !== undefined &&
                e.button !== 0
            ) {
                return;
            }


            this.isDragging = true;
            this.hasMoved = false;

            this.dragTarget = targetType;

            this.startX = e.clientX;
            this.startY = e.clientY;

            this.currentPointerId =
                e.pointerId;


            const rect =
                this.widget.getBoundingClientRect();


            this.initialLeft =
                rect.left;

            this.initialTop =
                rect.top;


            this.widget.classList.add(
                'is-dragging'
            );


            if (this.shield) {

                this.shield.style.display =
                    'block';

            }


            try {

                if (
                    e.target.setPointerCapture &&
                    e.pointerId !== undefined
                ) {

                    e.target.setPointerCapture(
                        e.pointerId
                    );

                }

            } catch (err) {

                // Ignore pointer capture errors

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


        /* =========================================================
           DRAGGING
        ========================================================= */

        onPointerMove(e) {

            if (!this.isDragging) return;


            const dx =
                e.clientX -
                this.startX;


            const dy =
                e.clientY -
                this.startY;


            /*
             * Only count as movement after 4 pixels.
             * This prevents a normal click from being
             * interpreted as a drag.
             */

            if (
                !this.hasMoved &&
                Math.hypot(dx, dy) > 4
            ) {

                this.hasMoved = true;

            }


            if (this.hasMoved) {

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

        }


        /* =========================================================
           DRAG END
        ========================================================= */

        onPointerUp(e) {

            if (!this.isDragging) return;


            this.isDragging = false;


            this.widget.classList.remove(
                'is-dragging'
            );


            if (this.shield) {

                this.shield.style.display =
                    'none';

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

                // Ignore

            }


            /*
             * Clicking the minimized pill opens
             * the widget again.
             */

            if (
                this.dragTarget === 'pill' &&
                !this.hasMoved
            ) {

                this.expand();

            }


            /*
             * Save current position.
             */

            this.savePosition();


            this.dragTarget = null;
            this.currentPointerId = null;

        }


        /* =========================================================
           RESIZE
        ========================================================= */

        startResize(e) {

            if (
                e.button !== undefined &&
                e.button !== 0
            ) {
                return;
            }


            e.stopPropagation();
            e.preventDefault();


            this.isResizing = true;


            this.startX = e.clientX;
            this.startY = e.clientY;


            const widgetRect =
                this.widget.getBoundingClientRect();


            const windowRect =
                this.windowEl.getBoundingClientRect();


            this.startWidth =
                windowRect.width;


            this.startRight =
                widgetRect.right;


            this.startLeft =
                widgetRect.left;


            this.widget.classList.add(
                'is-resizing'
            );


            if (this.shield) {

                this.shield.style.display =
                    'block';

            }


            try {

                if (
                    e.target.setPointerCapture &&
                    e.pointerId !== undefined
                ) {

                    e.target.setPointerCapture(
                        e.pointerId
                    );

                }

            } catch (err) {

                // Ignore

            }


            const onResizeMove = (ev) => {

                if (!this.isResizing) return;


                ev.preventDefault();


                /*
                 * Moving left increases width.
                 * Moving down increases height.
                 */

                const dx =
                    this.startX -
                    ev.clientX;


                const dy =
                    ev.clientY -
                    this.startY;


                const effectiveDelta =
                    Math.abs(dx) >
                    Math.abs(dy * 1.5)
                        ? dx
                        : (dy * (16 / 9));


                const minW = 260;


                const maxW =
                    Math.min(
                        680,
                        window.innerWidth - 24
                    );


                let newWidth =
                    Math.max(
                        minW,
                        Math.min(
                            maxW,
                            this.startWidth +
                            effectiveDelta
                        )
                    );


                /*
                 * Keep left edge inside viewport.
                 */

                if (
                    this.startRight -
                    newWidth <
                    12
                ) {

                    newWidth =
                        this.startRight -
                        12;

                }


                this.windowEl.style.width =
                    `${newWidth}px`;


                this.widget.style.left =
                    `${this.startRight - newWidth}px`;

            };


            const onResizeUp = (ev) => {

                this.isResizing = false;


                this.widget.classList.remove(
                    'is-resizing'
                );


                if (this.shield) {

                    this.shield.style.display =
                        'none';

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


        /* =========================================================
           ACTIVE ELEMENT
        ========================================================= */

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


        /* =========================================================
           CLAMP POSITION
        ========================================================= */

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


            /*
             * Update transform origin.
             * This makes the popup appear to grow/shrink
             * from the correct corner.
             */

            const isBottomHalf =
                (
                    clampedTop +
                    height / 2
                ) >
                (
                    window.innerHeight / 2
                );


            const isRightHalf =
                (
                    clampedLeft +
                    width / 2
                ) >
                (
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


        /* =========================================================
           CLAMP CURRENT POSITION
        ========================================================= */

        clampPosition() {

            const rect =
                this.widget.getBoundingClientRect();


            const currentLeft =
                parseFloat(
                    this.widget.style.left
                ) || rect.left;


            const currentTop =
                parseFloat(
                    this.widget.style.top
                ) || rect.top;


            this.applyClampedPosition(
                currentLeft,
                currentTop
            );

        }


        /* =========================================================
           SAVE POSITION
        ========================================================= */

        savePosition() {

            const rect =
                this.widget.getBoundingClientRect();


            localStorage.setItem(
                this.getStorageKey('left'),
                rect.left
            );


            localStorage.setItem(
                this.getStorageKey('top'),
                rect.top
            );

        }


        /* =========================================================
           MINIMIZE
        ========================================================= */

        minimize() {

            const pillWidth =
                this.minPillEl
                    ? (this.minPillEl.offsetWidth || 170)
                    : 170;


            const pillHeight =
                this.minPillEl
                    ? (this.minPillEl.offsetHeight || 42)
                    : 42;


            const marginRight = 18;
            const marginBottom = 18;


            /*
             * Always minimize to bottom-right.
             */

            const targetLeft =
                window.innerWidth -
                pillWidth -
                marginRight;


            const targetTop =
                window.innerHeight -
                pillHeight -
                marginBottom;


            /*
             * Remember minimized state.
             */

            localStorage.setItem(
                this.getStorageKey('minimized'),
                'true'
            );


            /*
             * Start minimize animation.
             */

            this.widget.classList.add(
                'is-minimizing'
            );


            /*
             * After animation:
             * actually switch to minimized mode.
             */

            setTimeout(() => {

                this.widget.classList.add(
                    'is-minimized'
                );


                this.widget.classList.remove(
                    'is-minimizing'
                );


                this.applyClampedPosition(
                    targetLeft,
                    targetTop
                );


                this.savePosition();

            }, 350);

        }


        /* =========================================================
           EXPAND
        ========================================================= */

        expand() {

            const pillRect =
                (
                    this.minPillEl ||
                    this.widget
                ).getBoundingClientRect();


            const windowWidth =
                this.windowEl
                    ? (
                        this.windowEl.offsetWidth ||
                        360
                    )
                    : 360;


            const windowHeight =
                this.windowEl
                    ? (
                        this.windowEl.offsetHeight ||
                        240
                    )
                    : 240;


            const isBottomHalf =
                (
                    pillRect.top +
                    pillRect.height / 2
                ) >
                (
                    window.innerHeight / 2
                );


            const isRightHalf =
                (
                    pillRect.left +
                    pillRect.width / 2
                ) >
                (
                    window.innerWidth / 2
                );


            const targetLeft =
                isRightHalf
                    ? (
                        pillRect.right -
                        windowWidth
                    )
                    : pillRect.left;


            const targetTop =
                isBottomHalf
                    ? (
                        pillRect.bottom -
                        windowHeight
                    )
                    : pillRect.top;


            /*
             * Remember that the widget is open.
             */

            localStorage.setItem(
                this.getStorageKey('minimized'),
                'false'
            );


            /*
             * Start expand animation.
             */

            this.widget.classList.add(
                'is-expanding'
            );


            /*
             * Remove minimized state after
             * the animation has started.
             */

            setTimeout(() => {

                this.widget.classList.remove(
                    'is-minimized'
                );


                this.applyClampedPosition(
                    targetLeft,
                    targetTop
                );


                /*
                 * Remove animation class after
                 * animation has completed.
                 */

                setTimeout(() => {

                    this.widget.classList.remove(
                        'is-expanding'
                    );

                }, 350);


                this.savePosition();

            }, 20);

        }

    }


    /* =============================================================
       INITIALIZE WIDGETS
    ============================================================= */

    document.addEventListener(
        'DOMContentLoaded',
        () => {

            /*
             * Video widget
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
             * Workshop booking widget
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


    /* =============================================================
       WORKSHOP BOOKING FORM
    ============================================================= */

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
         * Workshop page:
         * Meer informatie button
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


        if (!form) return;


        let lastBookingData = null;


        /* =========================================================
           FORM SUBMIT
        ========================================================= */

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


                /*
                 * Open mail client
                 */

                window.location.href =
                    mailtoUri;


                /*
                 * Display confirmation
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


        /* =========================================================
           COPY BUTTON
        ========================================================= */

        if (copyBtn) {

            copyBtn.addEventListener(
                'click',
                () => {

                    if (!lastBookingData) return;


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


        /* =========================================================
           RESET BUTTON
        ========================================================= */

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
