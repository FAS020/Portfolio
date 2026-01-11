document.addEventListener('DOMContentLoaded', () => {
    const photoColumn = document.querySelector('.column-photos');
    
    // Functie om te checken of we op mobiel zitten
    const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

    // Functie om de swipe-afstand van de titel dynamisch te berekenen
    const calculateTitleSlide = () => {
        if (!isMobile()) return;
        
        const titleContent = document.querySelector('.title-content');
        if (titleContent) {
            document.fonts.ready.then(() => {
                const contentWidth = titleContent.scrollWidth;
                const viewportWidth = window.innerWidth;
                const slidePercent = (contentWidth / viewportWidth) * 100 + 10;
                titleContent.style.setProperty('--slide-distance', `-${slidePercent}%`);
            });
        }
    };

    calculateTitleSlide();
    
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(calculateTitleSlide, 100);
    });

    // 1. Check of we terugkomen van een project en herstel de positie
    const savedScrollPos = sessionStorage.getItem('homeScrollPos');
    if (savedScrollPos) {
        // Scroll horizontaal naar de werk-kolom (kolom 2)
        setTimeout(() => {
            photoColumn.scrollIntoView({ inline: 'center', behavior: 'auto' });
            
            // Herstel de verticale scrollpositie
            photoColumn.scrollTop = savedScrollPos;
            
            // Verwijder de opgeslagen positie zodat het niet blijft hangen bij een verse refresh
            sessionStorage.removeItem('homeScrollPos');
        }, 50);
    }

    // 2. Sla de scrollpositie op wanneer we op een project klikken
    document.querySelectorAll('.column-photos a').forEach(link => {
        link.addEventListener('click', () => {
            sessionStorage.setItem('homeScrollPos', photoColumn.scrollTop);
        });
    });

    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            const section = link.getAttribute('data-section');
            
            // Als er geen data-section is (bijv. externe links), doe niets
            if (!section) return;

            e.preventDefault();
            
            const articleColumn = document.getElementById('article-column');

            if (section === 'work') {
                photoColumn.scrollIntoView({ behavior: 'smooth' });
            } else {
                // Verberg alle secties
                document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
                
                // Toon de geselecteerde sectie
                const targetId = 'section-' + section;
                const targetSection = document.getElementById(targetId);
                
                if (targetSection) {
                    targetSection.classList.add('active');
                    articleColumn.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
});