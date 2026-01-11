document.addEventListener('DOMContentLoaded', () => {
    // Automatisch het jaartal in de footer updaten
    const footerP = document.querySelector('footer p');
    if (footerP) {
        const currentYear = new Date().getFullYear();
        // Behoudt de rest van de tekst, update alleen het jaartal
        footerP.innerHTML = `&copy; ${currentYear} Portfolio Franco A. Soolsma. All rights reserved.`;
    }
});