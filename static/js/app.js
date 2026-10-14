
document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    // 1. Scroll reveal animations
    var revealItems = document.querySelectorAll(
        ".reveal, .reveal-left, .reveal-right"
    );

    if ("IntersectionObserver" in window) {
        var revealObserver = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("visible");
                        revealObserver.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1 }
        );

        revealItems.forEach(function (item) {
            revealObserver.observe(item);
        });
    } else {
        revealItems.forEach(function (item) {
            item.classList.add("visible");
        });
    }

    // 2. Header scroll effect
    var header = document.querySelector(".site-header");

    function updateHeader() {
        if (header) {
            header.classList.toggle("scrolled", window.scrollY > 30);
        }
    }

    window.addEventListener("scroll", updateHeader, { passive: true });
    updateHeader();

    // 3. Mobile navigation
    var menuToggle = document.querySelector(".menu-toggle");
    var navLinks = document.querySelector(".nav-links");

    if (menuToggle && navLinks) {
        menuToggle.addEventListener("click", function () {
            var isOpen = navLinks.classList.toggle("menu-open");

            menuToggle.classList.toggle("menu-active", isOpen);
            menuToggle.setAttribute("aria-expanded", String(isOpen));
        });

        navLinks.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                navLinks.classList.remove("menu-open");
                menuToggle.classList.remove("menu-active");
                menuToggle.setAttribute("aria-expanded", "false");
            });
        });
    }

    // 4. Active navigation
    var currentPath = window.location.pathname.replace(/\/+$/, "") || "/";

    document.querySelectorAll(".nav-links a").forEach(function (link) {
        try {
            var linkPath = new URL(link.href).pathname.replace(/\/+$/, "") || "/";

            link.classList.toggle("active", linkPath === currentPath);
        } catch (error) {
            console.warn("Navigation link error:", error);
        }
    });

    // 5. Animated background particles
    var particleLayer = document.querySelector("#particle-layer");

    if (particleLayer && !particleLayer.dataset.generated) {
        particleLayer.dataset.generated = "true";

        for (var i = 0; i < 24; i++) {
            var particle = document.createElement("span");

            particle.className = "cinema-particle";
            particle.style.left = Math.random() * 100 + "%";
            particle.style.animationDelay = Math.random() * 10 + "s";
            particle.style.animationDuration = 8 + Math.random() * 12 + "s";

            particleLayer.appendChild(particle);
        }
    }

    // 6. Movie search elements
    var searchForm = document.querySelector("#movie-search-form");
    var searchInput = document.querySelector("#movie-search");
    var movieResults = document.querySelector("#movie-results");
    var movieStatus = document.querySelector("#movie-status");
    var searchButton = document.querySelector("#movie-search-button");

    function setStatus(message) {
        if (movieStatus) {
            movieStatus.textContent = message;
        }
    }

    function escapeHTML(value) {
        return String(value == null ? "" : value).replace(
            /[&<>"']/g,
            function (character) {
                var entities = {
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;"
                };

                return entities[character];
            }
        );
    }

    function getImageURL(path) {
        if (!path || typeof path !== "string") {
            return "";
        }

        if (/^https?:\/\//i.test(path)) {
            return path;
        }

        if (path.charAt(0) === "/") {
            return "https://image.tmdb.org/t/p/w500" + path;
        }

        return "";
    }

    // 7. Movie detail and cast display
    async function loadMovieDetails(movie, container, button) {
        if (!movie.id) {
            container.textContent = "Movie details are unavailable.";
            return;
        }

        container.hidden = false;
        container.textContent = "Loading movie details...";
        button.disabled = true;

        try {
            var response = await fetch(
                "/movie-details/" + encodeURIComponent(movie.id),
                { headers: { Accept: "application/json" } }
            );

            if (!response.ok) {
                throw new Error("Request failed: " + response.status);
            }

            var details = await response.json();

            if (details.error) {
                throw new Error(details.error);
            }

            var extra = document.createElement("div");
            extra.className = "movie-extra";

            var overview = document.createElement("p");
            overview.textContent =
                details.overview || movie.overview || "No description available.";

            extra.appendChild(overview);

            if (details.runtime) {
                var runtime = document.createElement("p");
                runtime.textContent = "Runtime: " + details.runtime + " minutes";
                extra.appendChild(runtime);
            }

            if (Array.isArray(details.genres) && details.genres.length) {
                var genres = document.createElement("p");
                genres.textContent = "Genres: " + details.genres.join(", ");
                extra.appendChild(genres);
            }

            var heading = document.createElement("h4");
            heading.textContent = "Cast";
            extra.appendChild(heading);

            var castGrid = document.createElement("div");
            castGrid.className = "cast-grid";

            var cast = Array.isArray(details.cast) ? details.cast.slice(0, 6) : [];

            if (cast.length === 0) {
                var noCast = document.createElement("p");
                noCast.textContent = "Cast information unavailable.";
                castGrid.appendChild(noCast);
            }

            cast.forEach(function (person) {
                var member = document.createElement("div");
                member.className = "cast-member";

                var photoURL = getImageURL(person.photo || person.profile_path);

                if (photoURL) {
                    var image = document.createElement("img");
                    image.src = photoURL;
                    image.alt = person.name || "Cast member";
                    image.loading = "lazy";

                    image.addEventListener("error", function () {
                        image.remove();
                    }, { once: true });

                    member.appendChild(image);
                }

                var name = document.createElement("p");
                name.textContent = person.name || "Unknown";
                member.appendChild(name);

                if (person.character) {
                    var character = document.createElement("small");
                    character.textContent = person.character;
                    member.appendChild(character);
                }

                castGrid.appendChild(member);
            });

            extra.appendChild(castGrid);
            container.replaceChildren(extra);
            button.textContent = "Hide Details";
        } catch (error) {
            console.error("Movie details error:", error);
            container.textContent = "Unable to load details. Please try again.";
        } finally {
            button.disabled = false;
        }
    }

    // 8. Render movie cards
    function renderMovies(movies) {
        if (!movieResults) {
            return;
        }

        movieResults.replaceChildren();

        if (!Array.isArray(movies) || movies.length === 0) {
            setStatus("No movies found. Try another movie or actor name.");
            return;
        }

        setStatus(movies.length + " movie(s) found.");

        movies.forEach(function (movie) {
            var card = document.createElement("article");
            card.className = "movie-card reveal visible";

            var title = movie.title || movie.name || "Untitled Movie";
            var releaseDate = movie.release_date || movie.first_air_date || "";
            var year = releaseDate ? releaseDate.substring(0, 4) : "Year unavailable";
            var overview = movie.overview || "No movie description available.";
            var rating = Number(movie.rating ?? movie.vote_average);
            var ratingText = Number.isFinite(rating) ? rating.toFixed(1) : "N/A";
            var posterURL = getImageURL(movie.poster || movie.poster_path);

            var posterWrap = document.createElement("div");
            posterWrap.className = "movie-poster-wrap";

            if (posterURL) {
                var poster = document.createElement("img");
                poster.className = "movie-poster";
                poster.src = posterURL;
                poster.alt = title + " poster";
                poster.loading = "lazy";

                poster.addEventListener("error", function () {
                    var placeholder = document.createElement("div");
                    placeholder.className = "poster-placeholder";
                    placeholder.textContent = "Poster unavailable";
                    poster.replaceWith(placeholder);
                }, { once: true });

                posterWrap.appendChild(poster);
            } else {
                var placeholder = document.createElement("div");
                placeholder.className = "poster-placeholder";
                placeholder.textContent = "Poster unavailable";
                posterWrap.appendChild(placeholder);
            }

            var ratingBadge = document.createElement("span");
            ratingBadge.className = "movie-rating";
            ratingBadge.textContent = "★ " + ratingText;
            posterWrap.appendChild(ratingBadge);

            var content = document.createElement("div");
            content.className = "movie-card-content";

            var heading = document.createElement("h3");
            heading.className = "movie-title";
            heading.textContent = title;

            var date = document.createElement("p");
            date.className = "movie-release";
            date.textContent = year;

            var description = document.createElement("p");
            description.className = "movie-overview";
            description.textContent = overview;

            var actions = document.createElement("div");
            actions.className = "movie-actions";

            var detailsButton = document.createElement("button");
            detailsButton.className = "movie-details-button";
            detailsButton.type = "button";
            detailsButton.textContent = "View Details";

            var detailsContainer = document.createElement("div");
            detailsContainer.className = "movie-detail-content";
            detailsContainer.hidden = true;

            detailsButton.addEventListener("click", function () {
                if (!detailsContainer.hidden) {
                    detailsContainer.hidden = true;
                    detailsButton.textContent = "View Details";
                    return;
                }

                loadMovieDetails(movie, detailsContainer, detailsButton);
            });

            actions.appendChild(detailsButton);
            content.appendChild(heading);
            content.appendChild(date);
            content.appendChild(description);
            content.appendChild(actions);
            content.appendChild(detailsContainer);

            card.appendChild(posterWrap);
            card.appendChild(content);
            movieResults.appendChild(card);
        });
    }

    // 9. Search movies and actors through Flask
    async function searchMovies(query) {
        if (!movieResults) {
            console.error("Missing #movie-results element.");
            return;
        }

        var trimmedQuery = query.trim();

        if (!trimmedQuery) {
            setStatus("Enter a movie title or actor name.");
            return;
        }

        if (searchButton) {
            searchButton.disabled = true;
            searchButton.textContent = "Searching...";
        }

        movieResults.replaceChildren();
        setStatus("Searching movies...");

        try {
            var response = await fetch(
                "/movies?query=" + encodeURIComponent(trimmedQuery),
                { headers: { Accept: "application/json" } }
            );

            var data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || "Search request failed.");
            }

            var movies = Array.isArray(data)
                ? data
                : Array.isArray(data.results)
                    ? data.results
                    : [];

            renderMovies(movies);
        } catch (error) {
            console.error("Movie search error:", error);
            setStatus(error.message || "Search failed. Check the Flask server and TMDB API key.");
        } finally {
            if (searchButton) {
                searchButton.disabled = false;
                searchButton.textContent = "Search Movies";
            }
        }
    }

    if (searchForm && searchInput) {
        searchForm.addEventListener("submit", function (event) {
            event.preventDefault();
            searchMovies(searchInput.value);
        });

        searchMovies(searchInput.value.trim() || "Vijay");
    }

    // 10. Cinematic pointer effects
    document.querySelectorAll(
        ".feature-panel, .cinema-artwork, .tree-banner"
    ).forEach(function (panel) {
        panel.addEventListener("pointermove", function (event) {
            var rect = panel.getBoundingClientRect();

            if (!rect.width || !rect.height) {
                return;
            }

            panel.style.setProperty(
                "--pointer-x",
                ((event.clientX - rect.left) / rect.width) * 100 + "%"
            );

            panel.style.setProperty(
                "--pointer-y",
                ((event.clientY - rect.top) / rect.height) * 100 + "%"
            );
        });
    });

    // 11. Button feedback
    document.querySelectorAll(".button-primary, .button-secondary").forEach(
        function (button) {
            button.addEventListener("click", function () {
                button.classList.add("button-pressed");

                window.setTimeout(function () {
                    button.classList.remove("button-pressed");
                }, 180);
            });
        }
    );

    console.log("CineMind AI JavaScript loaded successfully.");
});
