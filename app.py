
from flask import Flask, render_template, request, jsonify
from model_utils import train_model
from dotenv import load_dotenv
import os
import requests

load_dotenv()

app = Flask(__name__)

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_URL = "https://image.tmdb.org/t/p/w500"

# Train the movie prediction model
results = train_model()
model = results["model"]


# TMDB API helper
def tmdb_get(endpoint, params=None):
    if not TMDB_API_KEY:
        raise ValueError(
            "TMDB_API_KEY missing. Check your .env file."
        )

    api_params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US"
    }

    if params:
        api_params.update(params)

    response = requests.get(
        f"{TMDB_BASE_URL}{endpoint}",
        params=api_params,
        timeout=20
    )

    response.raise_for_status()
    return response.json()


# Format movie information
def format_movie(movie):
    poster_path = movie.get("poster_path")
    backdrop_path = movie.get("backdrop_path")

    return {
        "id": movie.get("id"),
        "title": (
            movie.get("title")
            or movie.get("original_title")
            or movie.get("name")
            or "Untitled"
        ),
        "overview": movie.get("overview") or "No overview available.",
        "release_date": movie.get("release_date") or "",
        "rating": movie.get("vote_average", 0),
        "character": movie.get("character", ""),
        "poster": (
            f"{TMDB_IMAGE_URL}{poster_path}"
            if poster_path else None
        ),
        "backdrop": (
            f"https://image.tmdb.org/t/p/original{backdrop_path}"
            if backdrop_path else None
        )
    }


# Remove duplicate movies
def unique_movies(movie_list):
    unique = {}

    for movie in movie_list:
        movie_id = movie.get("id")

        if movie_id and movie_id not in unique:
            unique[movie_id] = movie

    return list(unique.values())


# Home page
@app.route("/")
def home():
    return render_template(
        "index.html",
        accuracy=results.get("accuracy", 0),
        dataset_size=results.get("dataset_size", 0),
        demo_data=results.get("demo_data", [])
    )


# Prediction page
@app.route("/prediction")
def prediction_page():
    return render_template("prediction.html")


# Decision tree page
@app.route("/decision-tree")
def decision_tree():
    return render_template(
        "decision_tree.html",
        accuracy=results.get("accuracy", 0),
        dataset_size=results.get("dataset_size", 0)
    )


# About page
@app.route("/about")
def about():
    return render_template("about.html")


# Search movies by movie title or actor name
@app.route("/movies")
def movies():
    query = request.args.get("query", "").strip()

    if not query:
        return jsonify({
            "error": "Please enter a movie title or actor name."
        }), 400

    try:
        normalized_query = " ".join(query.casefold().split())

        # First search for actors
        people_data = tmdb_get(
            "/search/person",
            {
                "query": query,
                "include_adult": False,
                "page": 1
            }
        )

        people = people_data.get("results", [])

        # Keep acting people whose names match the search
        actors = [
            person for person in people
            if person.get("known_for_department") == "Acting"
            and (
                normalized_query in " ".join(
                    (person.get("name") or "").casefold().split()
                )
                or " ".join(
                    (person.get("name") or "").casefold().split()
                ) in normalized_query
            )
        ]

        # Prefer exact actor name matches
        actors.sort(
            key=lambda person: (
                " ".join(
                    (person.get("name") or "").casefold().split()
                ) == normalized_query,
                float(person.get("popularity") or 0)
            ),
            reverse=True
        )

        # Get each matching actor's movie credits
        for actor in actors:
            credits = tmdb_get(
                f"/person/{actor['id']}/movie_credits"
            )

            actor_movies = unique_movies(
                credits.get("cast", [])
            )

            if actor_movies:
                actor_movies.sort(
                    key=lambda movie: movie.get("release_date") or "",
                    reverse=True
                )

                return jsonify([
                    format_movie(movie)
                    for movie in actor_movies
                ])

        # If no actor credits are found, search movie titles
        movie_data = tmdb_get(
            "/search/movie",
            {
                "query": query,
                "include_adult": False,
                "page": 1
            }
        )

        movie_results = unique_movies(
            movie_data.get("results", [])
        )

        return jsonify([
            format_movie(movie)
            for movie in movie_results
        ])

    except ValueError as error:
        app.logger.error("TMDB configuration error: %s", error)

        return jsonify({
            "error": str(error)
        }), 500

    except requests.RequestException:
        app.logger.exception("TMDB request failed")

        return jsonify({
            "error": (
                "TMDB request failed. Check your internet connection "
                "and API key."
            )
        }), 502

    except Exception:
        app.logger.exception("Movie search failed")

        return jsonify({
            "error": "Movie search failed. Check the Flask terminal."
        }), 500


# Movie details and cast
@app.route("/movie-details/<int:movie_id>")
def movie_details(movie_id):
    try:
        movie = tmdb_get(f"/movie/{movie_id}")
        credits = tmdb_get(f"/movie/{movie_id}/credits")

        cast = []

        for person in credits.get("cast", [])[:10]:
            profile_path = person.get("profile_path")

            cast.append({
                "name": person.get("name", "Unknown"),
                "character": person.get("character", ""),
                "photo": (
                    f"{TMDB_IMAGE_URL}{profile_path}"
                    if profile_path else None
                )
            })

        movie_info = format_movie(movie)
        movie_info["runtime"] = movie.get("runtime", 0)
        movie_info["genres"] = [
            genre.get("name")
            for genre in movie.get("genres", [])
        ]
        movie_info["cast"] = cast

        return jsonify(movie_info)

    except requests.RequestException:
        app.logger.exception("Movie details request failed")

        return jsonify({
            "error": "Unable to fetch movie details from TMDB."
        }), 502


# Movie success prediction
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(silent=True) or {}

        budget = float(data.get("budget", 0))
        rating = float(data.get("rating", -1))
        runtime = float(data.get("runtime", 0))

        if budget <= 0:
            return jsonify({
                "error": "Budget must be greater than zero."
            }), 400

        if not 0 <= rating <= 10:
            return jsonify({
                "error": "Rating must be between 0 and 10."
            }), 400

        if runtime <= 0:
            return jsonify({
                "error": "Runtime must be greater than zero."
            }), 400

        prediction = model.predict([
            [budget, rating, runtime]
        ])[0]

        success_labels = {
            "1", "true", "success", "successful",
            "likely successful", "hit", "yes"
        }

        is_successful = (
            str(prediction).strip().casefold() in success_labels
        )

        label = (
            "Likely Successful"
            if is_successful
            else "May Need Improvement"
        )

        probability = None

        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba([
                [budget, rating, runtime]
            ])[0]

            for index, class_label in enumerate(model.classes_):
                if str(class_label).strip().casefold() in success_labels:
                    probability = round(
                        float(probabilities[index]) * 100, 2
                    )
                    break

        return jsonify({
            "prediction": label,
            "result": label,
            "success_probability": probability,
            "message": (
                "The model predicts a higher chance of success."
                if is_successful
                else "Consider improving the movie's expected performance."
            )
        })

    except (TypeError, ValueError):
        return jsonify({
            "error": "Enter valid numeric values for all fields."
        }), 400

    except Exception:
        app.logger.exception("Prediction failed")

        return jsonify({
            "error": "Prediction failed. Check the Flask terminal."
        }), 500


# Model information
@app.route("/model-info")
def model_info():
    return jsonify({
        "accuracy": results.get("accuracy", 0),
        "dataset_size": results.get("dataset_size", 0),
        "tree_image": "/static/decision_tree.png"
    })


# Start Flask
if __name__ == "__main__":
    app.run(debug=True)
