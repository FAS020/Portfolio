document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.container');
    const columnPhotos = document.querySelector('.column-photos');
    const columnInfo = document.querySelector('.column-info');
    const images = document.querySelectorAll('.column-photos img');
    const navCloseBtn = document.querySelector('.nav-close-btn');
    const articleContent = document.querySelector('.article-content');
    const defaultContent = document.querySelector('.default-content');
    let lastClickedImage = null; // Variabele om de laatst geklikte afbeelding te onthouden

    // Functie om te checken of we op mobiel zitten
    const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

    // Functie om de swipe-afstand van de titel dynamisch te berekenen
    const calculateTitleSlide = () => {
        if (!isMobile()) return;
        
        const titleContent = document.querySelector('.title-content');
        if (titleContent) {
            // Wacht even tot fonts geladen zijn voor accurate meting
            document.fonts.ready.then(() => {
                // Meet de breedte van de inhoud (scrollWidth)
                const contentWidth = titleContent.scrollWidth;
                const viewportWidth = window.innerWidth;
                
                // Bereken hoeveel % we moeten schuiven om de hele tekst + een beetje extra te laten zien
                // We voegen 10% van de viewport toe als extra marge
                const slidePercent = (contentWidth / viewportWidth) * 100 + 10;
                
                titleContent.style.setProperty('--slide-distance', `-${slidePercent}%`);
            });
        }
    };

    // Navigatie logica
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            // Home-link negeren (standaard gedrag)
            const href = link.getAttribute('href');
            if (href === 'index.html' || href === 'home' || href === '/') return;

            e.preventDefault();
            const section = link.getAttribute('data-section');

            if (section === 'project-info') {
                // Toon info sectie
                columnInfo.classList.add('show');
                columnPhotos.classList.remove('expanded');
                columnInfo.classList.remove('expanded'); // Zorg dat de kolom zichtbaar is (reset expanded state)

                // Scroll functionaliteit voor mobiel
                if (isMobile()) {
                    // Scroll naar de derde kolom (Info)
                    setTimeout(() => {
                        container.scrollLeft = columnInfo.offsetLeft;
                    }, 10);
                }
            } else if (section === 'work') {
                // Scroll naar werk (alleen relevant voor mobiel menu item)
                if (isMobile()) {
                    columnPhotos.classList.add('show');
                    columnInfo.classList.remove('show');
                    columnPhotos.classList.remove('expanded');
                    columnInfo.classList.remove('expanded');
                    // Scroll naar de tweede kolom (Werk)
                    setTimeout(() => {
                        container.scrollLeft = columnPhotos.offsetLeft;
                    }, 10);
                } else {
                    // Desktop: reset naar default view
                    columnInfo.classList.remove('show');
                    columnPhotos.classList.remove('expanded');
                    columnInfo.classList.remove('expanded');
                }
            }
        });
    });

    // Afbeelding vergroten (alleen desktop)
    images.forEach(image => {
        image.addEventListener('click', (e) => {
            if (!isMobile()) {
                lastClickedImage = image; // Sla de afbeelding op
                e.stopPropagation();
                columnPhotos.classList.add('expanded');
                columnInfo.classList.add('expanded');
                if (navCloseBtn) navCloseBtn.style.display = 'block';

                // Scroll direct naar de aangeklikte afbeelding in de nieuwe weergave
                setTimeout(() => {
                    image.scrollIntoView({ block: 'center', behavior: 'auto' });
                }, 0);
            }
        });
    });

    // Sluit knop en klik-buiten-om-te-sluiten logica
    const closeExpandedView = () => {
        // Bepaal welke afbeelding momenteel het meest centraal in beeld staat
        let targetImage = lastClickedImage;
        let minDistance = Infinity;
        const containerRect = columnPhotos.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;

        images.forEach(image => {
            const rect = image.getBoundingClientRect();
            const imageCenter = rect.top + rect.height / 2;
            const distance = Math.abs(containerCenter - imageCenter);

            if (distance < minDistance) {
                minDistance = distance;
                targetImage = image;
            }
        });

        columnPhotos.classList.remove('expanded');
        columnInfo.classList.remove('expanded');
        if (navCloseBtn) navCloseBtn.style.display = 'none';
        
        // Scroll terug naar de afbeelding die we aan het bekijken waren
        if (targetImage) {
            targetImage.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
    };

    document.addEventListener('click', (e) => {
        if (!columnPhotos.contains(e.target) && !columnInfo.contains(e.target) && (!navCloseBtn || !navCloseBtn.contains(e.target))) {
            closeExpandedView();
        }
    });

    if (navCloseBtn) {
        navCloseBtn.addEventListener('click', closeExpandedView);
    }

    // Initialiseer de titel berekening
    calculateTitleSlide();
    
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(calculateTitleSlide, 100);
    });
});