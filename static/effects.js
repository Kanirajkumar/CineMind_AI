
document.addEventListener("DOMContentLoaded", () => {
    // Reveal sections only when the browser supports the observer.
    const revealElements = document.querySelectorAll(
        ".section-block, .stat-card, .concept-card, .closing-banner"
    );

    if ("IntersectionObserver" in window) {
        revealElements.forEach((element) => {
            element.classList.add("reveal");
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.08
        });

        revealElements.forEach((element) => {
            observer.observe(element);
        });
    }

    // Cinematic loading state for movie search.
    const searchForm = document.getElementById("movie-search-form");
    const movieInput = document.getElementById("movie-search");
    const status = document.getElementById("movie-status");

    if (searchForm && movieInput && status) {
        searchForm.addEventListener("submit", () => {
            if (!movieInput.value.trim()) return;

            status.innerHTML = `
                <div class="cinema-loader" aria-hidden="true"></div>
                <p>Exploring the cinema universe...</p>
            `;
        });
    }

    // Smooth navigation for internal page links.
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener("click", (event) => {
            const targetId = link.getAttribute("href");
            const target = document.querySelector(targetId);

            if (target) {
                event.preventDefault();
                target.scrollIntoView({
                    behavior: window.matchMedia(
                        "(prefers-reduced-motion: reduce)"
                    ).matches ? "auto" : "smooth",
                    block: "start"
                });
            }
        });
    });
});
