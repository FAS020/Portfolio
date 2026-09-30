/**
 * Draggable Floating Widgets (Video Window & Workshop Booking Popup)
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
            this.dragTarget = null; // 'header' or 'pill'
            this.currentPointerId = null;

            this.onPointerMove = this.onPointerMove.bind(this);
            this.onPointerUp = this.onPointerUp.bind(this);

            this.init();
        }

        init() {
            if (!this.widget) return;

            // Wait a tick for initial layout, then center spawn
            setTimeout(() => {
                this.normalizePosition();
            }, 60);

            // Listeners for window header dragging
            if (this.headerEl) {
                this.headerEl.addEventListener('pointerdown', (e) => {
                    // Don't drag if clicking on close button
                    if (e.target.closest('.floating-controls') || e.target.closest('button')) {
                        return;
                    }
                    this.startDrag(e, 'header');
                });
            }

            // Listeners for minimized pill dragging & clicking
            if (this.minPillEl) {
                this.minPillEl.addEventListener('pointerdown', (e) => {
                    this.startDrag(e, 'pill');
                });
            }

            // Close button handler (minimizes window to the button)
            if (this.closeBtn) {
                this.closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.minimize();
                });
            }

            // Bottom-right resize handle (for video scaling)
            if (this.resizeBr) {
                this.resizeBr.addEventListener('pointerdown', (e) => {
                    this.startResize(e);
                });
            }

            // Reposition on window resize to ensure it stays in viewport
            window.addEventListener('resize', () => {
                this.clampPosition();
            });
        }

        normalizePosition() {
            // Spawn directly in the center of the page
            const width = this.windowEl ? this.windowEl.offsetWidth : (this.widget.offsetWidth || 380);
            const height = this.windowEl ? this.windowEl.offsetHeight : (this.widget.offsetHeight || 300);

            const centerX = Math.max(12, Math.round((window.innerWidth - width) / 2));
            const centerY = Math.max(52, Math.round((window.innerHeight - height) / 2));

            this.widget.style.transform = 'none';
            this.widget.style.left = `${centerX}px`;
            this.widget.style.top = `${centerY}px`;
            this.widget.style.right = 'auto';
            this.widget.style.bottom = 'auto';
            this.clampPosition();
        }

        startDrag(e, targetType) {
            // Only primary mouse button or touch
            if (e.button !== undefined && e.button !== 0) return;

            this.isDragging = true;
            this.hasMoved = false;
            this.dragTarget = targetType;
            this.startX = e.clientX;
            this.startY = e.clientY;
            this.currentPointerId = e.pointerId;

            const rect = this.widget.getBoundingClientRect();
            this.initialLeft = rect.left;
            this.initialTop = rect.top;

            this.widget.classList.add('is-dragging');

            if (this.shield) {
                this.shield.style.display = 'block';
            }

            try {
                if (e.target.setPointerCapture && e.pointerId !== undefined) {
                    e.target.setPointerCapture(e.pointerId);
                }
            } catch (err) {
                // Ignore
            }

            window.addEventListener('pointermove', this.onPointerMove, { passive: false });
            window.addEventListener('pointerup', this.onPointerUp);
            window.addEventListener('pointercancel', this.onPointerUp);

            e.preventDefault();
        }

        onPointerMove(e) {
            if (!this.isDragging) return;

            const dx = e.clientX - this.startX;
            const dy = e.clientY - this.startY;

            // Only count as moved if dragged more than 4 pixels (distinguishes clicks from drags)
            if (!this.hasMoved && Math.hypot(dx, dy) > 4) {
                this.hasMoved = true;
            }

            if (this.hasMoved) {
                e.preventDefault();
                const newLeft = this.initialLeft + dx;
                const newTop = this.initialTop + dy;
                this.applyClampedPosition(newLeft, newTop);
            }
        }

        onPointerUp(e) {
            if (!this.isDragging) return;

            this.isDragging = false;
            this.widget.classList.remove('is-dragging');

            if (this.shield) {
                this.shield.style.display = 'none';
            }

            window.removeEventListener('pointermove', this.onPointerMove);
            window.removeEventListener('pointerup', this.onPointerUp);
            window.removeEventListener('pointercancel', this.onPointerUp);

            try {
                if (e.target && e.target.releasePointerCapture && this.currentPointerId !== null) {
                    e.target.releasePointerCapture(this.currentPointerId);
                }
            } catch (err) {
                // Ignore
            }

            // If user clicked the pill without dragging, expand the window!
            if (this.dragTarget === 'pill' && !this.hasMoved) {
                this.expand();
            }

            this.dragTarget = null;
            this.currentPointerId = null;
        }

        startResize(e) {
            if (e.button !== undefined && e.button !== 0) return;
            e.stopPropagation();
            e.preventDefault();

            this.isResizing = true;
            this.startX = e.clientX;
            this.startY = e.clientY;

            const widgetRect = this.widget.getBoundingClientRect();
            const windowRect = this.windowEl.getBoundingClientRect();

            this.startWidth = windowRect.width;
            this.startRight = widgetRect.right;
            this.startLeft = widgetRect.left;

            this.widget.classList.add('is-resizing');
            if (this.shield) {
                this.shield.style.display = 'block';
            }

            try {
                if (e.target.setPointerCapture && e.pointerId !== undefined) {
                    e.target.setPointerCapture(e.pointerId);
                }
            } catch (err) {}

            const onResizeMove = (ev) => {
                if (!this.isResizing) return;
                ev.preventDefault();

                // Moving pointer left increases width; moving down increases height (16:9 ratio)
                const dx = this.startX - ev.clientX;
                const dy = ev.clientY - this.startY;

                const effectiveDelta = Math.abs(dx) > Math.abs(dy * 1.5) ? dx : (dy * (16 / 9));

                const minW = 260;
                const maxW = Math.min(680, window.innerWidth - 24);

                let newWidth = Math.max(minW, Math.min(maxW, this.startWidth + effectiveDelta));

                // Clamp so left edge stays within screen margin
                if (this.startRight - newWidth < 12) {
                    newWidth = this.startRight - 12;
                }

                this.windowEl.style.width = `${newWidth}px`;
                this.widget.style.left = `${this.startRight - newWidth}px`;
            };

            const onResizeUp = (ev) => {
                this.isResizing = false;
                this.widget.classList.remove('is-resizing');
                if (this.shield) {
                    this.shield.style.display = 'none';
                }

                window.removeEventListener('pointermove', onResizeMove);
                window.removeEventListener('pointerup', onResizeUp);
                window.removeEventListener('pointercancel', onResizeUp);

                try {
                    if (e.target.releasePointerCapture && e.pointerId !== undefined) {
                        e.target.releasePointerCapture(e.pointerId);
                    }
                } catch (err) {}
            };

            window.addEventListener('pointermove', onResizeMove, { passive: false });
            window.addEventListener('pointerup', onResizeUp);
            window.addEventListener('pointercancel', onResizeUp);
        }

        getActiveElement() {
            if (this.widget.classList.contains('is-minimized')) {
                return this.minPillEl || this.widget;
            }
            return this.windowEl || this.widget;
        }

        applyClampedPosition(left, top) {
            const activeEl = this.getActiveElement();
            const width = activeEl.offsetWidth || 340;
            const height = activeEl.offsetHeight || 220;

            const marginX = 12;
            const marginTop = 52; // Keep clear of fixed top navbar (approx 48px)
            const marginBottom = 18; // Keep clear of footer

            const minX = marginX;
            const maxX = Math.max(marginX, window.innerWidth - width - marginX);
            const minY = marginTop;
            const maxY = Math.max(marginTop, window.innerHeight - height - marginBottom);

            const clampedLeft = Math.max(minX, Math.min(left, maxX));
            const clampedTop = Math.max(minY, Math.min(top, maxY));

            this.widget.style.left = `${clampedLeft}px`;
            this.widget.style.top = `${clampedTop}px`;
            this.widget.style.right = 'auto';
            this.widget.style.bottom = 'auto';

            // Update transform origin dynamically
            const isBottomHalf = (clampedTop + height / 2) > (window.innerHeight / 2);
            const isRightHalf = (clampedLeft + width / 2) > (window.innerWidth / 2);
            const originY = isBottomHalf ? 'bottom' : 'top';
            const originX = isRightHalf ? 'right' : 'left';
            if (this.windowEl) {
                this.windowEl.style.transformOrigin = `${originY} ${originX}`;
            }
            if (this.minPillEl) {
                this.minPillEl.style.transformOrigin = `${originY} ${originX}`;
            }
        }

        clampPosition() {
            const rect = this.widget.getBoundingClientRect();
            const currentLeft = parseFloat(this.widget.style.left) || rect.left;
            const currentTop = parseFloat(this.widget.style.top) || rect.top;
            this.applyClampedPosition(currentLeft, currentTop);
        }

        minimize() {
            const windowRect = this.windowEl.getBoundingClientRect();
            const pillWidth = this.minPillEl ? (this.minPillEl.offsetWidth || 170) : 170;
            const pillHeight = this.minPillEl ? (this.minPillEl.offsetHeight || 42) : 42;

            // Anchor corner preservation: keep the corner closest to screen edge pinned
            const isBottomHalf = (windowRect.top + windowRect.height / 2) > (window.innerHeight / 2);
            const isRightHalf = (windowRect.left + windowRect.width / 2) > (window.innerWidth / 2);

            const targetLeft = isRightHalf ? (windowRect.right - pillWidth) : windowRect.left;
            const targetTop = isBottomHalf ? (windowRect.bottom - pillHeight) : windowRect.top;

            this.widget.classList.add('is-minimized');
            this.applyClampedPosition(targetLeft, targetTop);
        }

        expand() {
            const pillRect = (this.minPillEl || this.widget).getBoundingClientRect();

            this.widget.classList.remove('is-minimized');
            const windowWidth = this.windowEl ? (this.windowEl.offsetWidth || 360) : 360;
            const windowHeight = this.windowEl ? (this.windowEl.offsetHeight || 240) : 240;

            const isBottomHalf = (pillRect.top + pillRect.height / 2) > (window.innerHeight / 2);
            const isRightHalf = (pillRect.left + pillRect.width / 2) > (window.innerWidth / 2);

            const targetLeft = isRightHalf ? (pillRect.right - windowWidth) : pillRect.left;
            const targetTop = isBottomHalf ? (pillRect.bottom - windowHeight) : pillRect.top;

            this.applyClampedPosition(targetLeft, targetTop);
        }
    }

    // Initialize all widgets on page load
    document.addEventListener('DOMContentLoaded', () => {
        // Video widget (monoprint.html)
        const videoWidgetEl = document.getElementById('floating-video-widget');
        if (videoWidgetEl) {
            new DraggableWidget(videoWidgetEl);
        }

        // Workshop Booking widget (index.html & workshop.html)
        const bookingWidgetEl = document.getElementById('floating-booking-widget');
        if (bookingWidgetEl) {
            new DraggableWidget(bookingWidgetEl);
            setupBookingForm(bookingWidgetEl);
        }
    });

    /**
     * Handles workshop booking form interaction, mailto generation, and feedback
     */
    function setupBookingForm(widgetEl) {
        const form = widgetEl.querySelector('.booking-form');
        const feedbackEl = widgetEl.querySelector('.booking-feedback');
        const copyBtn = widgetEl.querySelector('.booking-copy-btn');
        const resetBtn = widgetEl.querySelector('.booking-reset-btn');
        const moreInfoBtn = widgetEl.querySelector('.booking-more-info-btn');

        // If on workshop.html already, clicking "Meer informatie" shows/scrolls to project info
        if (moreInfoBtn && (window.location.pathname.endsWith('workshop') || window.location.pathname.endsWith('workshop.html'))) {
            moreInfoBtn.addEventListener('click', (e) => {
                const infoLink = document.querySelector('#info-link a');
                const columnInfo = document.querySelector('.column-info');
                if (infoLink) {
                    e.preventDefault();
                    infoLink.click();
                } else if (columnInfo) {
                    e.preventDefault();
                    columnInfo.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }

        if (!form) return;

        let lastBookingData = null;

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = (form.querySelector('#booking-name')?.value || '').trim();
            const email = (form.querySelector('#booking-email')?.value || '').trim();
            const phone = (form.querySelector('#booking-phone')?.value || '').trim();
            const date = (form.querySelector('#booking-date')?.value || '').trim();
            const participants = (form.querySelector('#booking-participants')?.value || '').trim();
            const groupType = form.querySelector('#booking-type')?.value || '';
            const notes = (form.querySelector('#booking-message')?.value || '').trim();

            if (!name || !email) {
                alert('Vul alstublieft minimaal je naam en e-mailadres in.');
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

            lastBookingData = formattedDetails;

            const mailSubject = encodeURIComponent(`Aanvraag Mobiele Workshop - ${name}`);
            const mailBody = encodeURIComponent(formattedDetails);
            const mailtoUri = `mailto:francosoolsma@gmail.com?subject=${mailSubject}&body=${mailBody}`;

            // Trigger mail client
            window.location.href = mailtoUri;

            // Display confirmation feedback banner in the widget
            if (feedbackEl) {
                feedbackEl.classList.add('show');
                const feedbackSummary = feedbackEl.querySelector('.booking-feedback-summary');
                if (feedbackSummary) {
                    feedbackSummary.textContent = `Aanvraag voor ${name} (${email}) klaargezet in je e-mailprogramma.`;
                }
            }
        });

        // Copy text button
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                if (!lastBookingData) return;
                navigator.clipboard.writeText(lastBookingData).then(() => {
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = '✓ Gekopieerd!';
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                    }, 2200);
                }).catch(() => {
                    alert('Kon tekst niet automatisch kopiëren. Selecteer en kopieer handmatig.');
                });
            });
        }

        // Reset form to make another inquiry
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                form.reset();
                if (feedbackEl) {
                    feedbackEl.classList.remove('show');
                }
            });
        }
    }
})();
