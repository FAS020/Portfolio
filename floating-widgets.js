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

            this.isBooking = this.widget.id === 'floating-booking-widget';
            this.storageKey = this.isBooking ? 'floating_booking_minimized' : 'floating_video_minimized';

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

            // Zorg dat de animatie icoontjes aanwezig zijn in knoppen
            this.setupControlIcons();

            // Controleer of we zijn doorverwezen via "Meer informatie"
            let forceOpen = false;
            if (this.isBooking) {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('from') === 'more-info' || sessionStorage.getItem('force_open_booking') === 'true') {
                    forceOpen = true;
                    try {
                        sessionStorage.removeItem('force_open_booking');
                        localStorage.setItem(this.storageKey, 'false');
                    } catch (e) {}
                }
            }

            let isStoredMinimized = false;
            try {
                isStoredMinimized = !forceOpen && localStorage.getItem(this.storageKey) === 'true';
            } catch (e) {}

            if (isStoredMinimized) {
                // Direct geminimaliseerd starten in de rechter onderhoek
                this.widget.classList.add('is-minimized');
                this.widget.style.transform = 'none';
                this.widget.style.right = 'auto';
                this.widget.style.bottom = 'auto';
                setTimeout(() => {
                    const br = this.getBottomRightPosition();
                    this.widget.style.left = `${br.left}px`;
                    this.widget.style.top = `${br.top}px`;
                }, 40);
            } else {
                // Direct gecentreerd spawnen met openingsanimatie
                setTimeout(() => {
                    this.normalizePosition();
                    if (this.windowEl) {
                        this.windowEl.classList.add('popup-enter');
                        setTimeout(() => {
                            this.windowEl.classList.remove('popup-enter');
                        }, 450);
                    }
                }, 60);
            }

            // Listeners for window header dragging
            if (this.headerEl) {
                this.headerEl.addEventListener('pointerdown', (e) => {
                    // Don't drag if clicking on close/minimize button
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

                this.minPillEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.expand();
                });
            }

            // Close/minimize button handler
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

            // Reposition on window resize to ensure it stays in viewport / docked
            window.addEventListener('resize', () => {
                if (this.widget.classList.contains('is-minimized')) {
                    const br = this.getBottomRightPosition();
                    this.widget.style.left = `${br.left}px`;
                    this.widget.style.top = `${br.top}px`;
                } else {
                    this.clampPosition();
                }
            });
        }

        setupControlIcons() {
            // Header sluit-/minimaliseerknop: minteken (-) dat bij hover een kruisje (×) wordt
            if (this.closeBtn && !this.closeBtn.querySelector('.ctrl-icon')) {
                this.closeBtn.innerHTML = `
                    <span class="ctrl-icon" aria-hidden="true">
                        <span class="ctrl-line line-1"></span>
                        <span class="ctrl-line line-2"></span>
                    </span>
                `;
            }

            // Geminimaliseerde pill: plusje (+) om te maximaliseren
            if (this.minPillEl && !this.minPillEl.querySelector('.pill-ctrl')) {
                const pillCtrl = document.createElement('span');
                pillCtrl.className = 'pill-ctrl';
                pillCtrl.setAttribute('aria-hidden', 'true');
                pillCtrl.innerHTML = `
                    <span class="ctrl-icon is-plus">
                        <span class="ctrl-line line-1"></span>
                        <span class="ctrl-line line-2"></span>
                    </span>
                `;
                this.minPillEl.appendChild(pillCtrl);
            }
        }

        getBottomRightPosition() {
            const marginX = 20;
            const marginBottom = 20;
            const pillW = this.minPillEl ? (this.minPillEl.offsetWidth || 240) : 240;
            const pillH = this.minPillEl ? (this.minPillEl.offsetHeight || 42) : 42;
            const targetLeft = Math.max(12, window.innerWidth - pillW - marginX);
            const targetTop = Math.max(52, window.innerHeight - pillH - marginBottom);
            return { left: targetLeft, top: targetTop };
        }

        getCenterPosition() {
            const width = this.windowEl ? (this.windowEl.offsetWidth || 380) : (this.widget.offsetWidth || 380);
            const height = this.windowEl ? (this.windowEl.offsetHeight || 300) : (this.widget.offsetHeight || 300);
            const centerX = Math.max(12, Math.round((window.innerWidth - width) / 2));
            const centerY = Math.max(52, Math.round((window.innerHeight - height) / 2));
            return { left: centerX, top: centerY };
        }

        normalizePosition() {
            const center = this.getCenterPosition();
            this.widget.style.transform = 'none';
            this.widget.style.left = `${center.left}px`;
            this.widget.style.top = `${center.top}px`;
            this.widget.style.right = 'auto';
            this.widget.style.bottom = 'auto';
            this.clampPosition();
        }

        startDrag(e, targetType) {
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
            } catch (err) {}

            window.addEventListener('pointermove', this.onPointerMove, { passive: false });
            window.addEventListener('pointerup', this.onPointerUp);
            window.addEventListener('pointercancel', this.onPointerUp);

            e.preventDefault();
        }

        onPointerMove(e) {
            if (!this.isDragging) return;

            const dx = e.clientX - this.startX;
            const dy = e.clientY - this.startY;

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
            } catch (err) {}

            // Als op de geminimaliseerde pill is geklikt zonder te slepen, maximaliseer
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
            this.startLeft = widgetRect.left;
            this.startTop = widgetRect.top;

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

                // Slepen naar rechts of beneden vergroot het venster
                const dx = ev.clientX - this.startX;
                const dy = ev.clientY - this.startY;

                // 16:9 beeldverhouding
                const effectiveDelta = Math.abs(dx) > Math.abs(dy * (16 / 9)) ? dx : (dy * (16 / 9));

                const minW = 260;
                const maxW = Math.min(800, window.innerWidth - 24);

                let newWidth = Math.max(minW, Math.min(maxW, this.startWidth + effectiveDelta));

                const margin = 12;
                let newLeft = this.startLeft;

                // Schalen naar rechts: als het venster rechts buiten het scherm dreigt te vallen, schaal ook naar links
                if (newLeft + newWidth > window.innerWidth - margin) {
                    newLeft = window.innerWidth - margin - newWidth;
                }

                // Zorg dat linkerrand binnen het scherm blijft
                if (newLeft < margin) {
                    newLeft = margin;
                    newWidth = Math.min(newWidth, window.innerWidth - margin * 2);
                }

                this.windowEl.style.width = `${newWidth}px`;
                this.widget.style.left = `${newLeft}px`;

                // Zorg ook dat onderkant binnen het scherm blijft
                const approxHeight = (newWidth * 9 / 16) + 38;
                const marginBottom = 18;
                if (this.startTop + approxHeight > window.innerHeight - marginBottom) {
                    const adjustedTop = Math.max(52, window.innerHeight - marginBottom - approxHeight);
                    this.widget.style.top = `${adjustedTop}px`;
                }
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

                this.clampPosition();
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
            const marginTop = 52;
            const marginBottom = 18;

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
        }

        clampPosition() {
            const rect = this.widget.getBoundingClientRect();
            const currentLeft = parseFloat(this.widget.style.left) || rect.left;
            const currentTop = parseFloat(this.widget.style.top) || rect.top;
            this.applyClampedPosition(currentLeft, currentTop);
        }

        minimize() {
            if (this.widget.classList.contains('is-minimized')) return;

            // Altijd minimaliseren naar de rechter onderhoek
            const target = this.getBottomRightPosition();

            this.widget.classList.add('is-animating');
            this.widget.classList.add('is-minimized');
            this.widget.style.left = `${target.left}px`;
            this.widget.style.top = `${target.top}px`;

            try {
                localStorage.setItem(this.storageKey, 'true');
            } catch (e) {}

            setTimeout(() => {
                this.widget.classList.remove('is-animating');
            }, 400);
        }

        expand() {
            if (!this.widget.classList.contains('is-minimized')) return;

            // Altijd weer gecentreerd op de pagina bij maximaliseren, zelfs na verslepen!
            const center = this.getCenterPosition();

            this.widget.classList.add('is-animating');
            this.widget.classList.remove('is-minimized');
            this.widget.style.left = `${center.left}px`;
            this.widget.style.top = `${center.top}px`;

            try {
                localStorage.setItem(this.storageKey, 'false');
            } catch (e) {}

            setTimeout(() => {
                this.widget.classList.remove('is-animating');
                this.clampPosition();
            }, 400);
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

        // Klik op "Meer informatie" knop: forceer openen van popup op workshop pagina
        if (moreInfoBtn) {
            moreInfoBtn.addEventListener('click', (e) => {
                try {
                    sessionStorage.setItem('force_open_booking', 'true');
                    localStorage.setItem('floating_booking_minimized', 'false');
                } catch (err) {}

                // Indien reeds op workshop.html, scroll naar project info
                if (window.location.pathname.endsWith('workshop') || window.location.pathname.endsWith('workshop.html')) {
                    const infoLink = document.querySelector('#info-link a');
                    const columnInfo = document.querySelector('.column-info');
                    if (infoLink) {
                        e.preventDefault();
                        infoLink.click();
                    } else if (columnInfo) {
                        e.preventDefault();
                        columnInfo.scrollIntoView({ behavior: 'smooth' });
                    }
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
