
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("prediction-form");
    if (!form) return;

    const budgetInput = document.getElementById("budget");
    const ratingInput = document.getElementById("rating");
    const runtimeInput = document.getElementById("runtime");
    const button = document.getElementById("predict-button");

    const title = document.getElementById("result-title");
    const message = document.getElementById("result-message");
    const resultClass = document.getElementById("result-class");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const budget = Number(budgetInput.value);
        const rating = Number(ratingInput.value);
        const runtime = Number(runtimeInput.value);

        if (
            !Number.isFinite(budget) || budget <= 0 ||
            !Number.isFinite(rating) || rating < 0 || rating > 10 ||
            !Number.isFinite(runtime) || runtime <= 0
        ) {
            title.textContent = "Check your inputs";
            message.textContent =
                "Budget and runtime must be positive. Rating must be between 0 and 10.";
            resultClass.textContent = "INVALID INPUT";
            resultClass.className = "result-tag warning";
            return;
        }

        button.disabled = true;
        button.textContent = "Analysing movie...";
        title.textContent = "Analysing your movie...";
        message.textContent = "Sending your values to the trained Decision Tree model.";
        resultClass.textContent = "PLEASE WAIT";
        resultClass.className = "result-tag";

        try {
            const response = await fetch("/predict", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ budget, rating, runtime })
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || "Prediction failed.");
            }

            const prediction = data.prediction || data.message || data.result;

            if (!prediction) {
                throw new Error("The server did not return a prediction.");
            }

            title.textContent = prediction;
            message.textContent =
                "This result was returned by your trained Decision Tree model. It is an estimate based on the model's training data, not a guarantee of movie success.";

            if (Number(data.class) === 1) {
                resultClass.textContent = "LIKELY SUCCESSFUL";
                resultClass.className = "result-tag success";
            } else {
                resultClass.textContent = "NEEDS FURTHER REVIEW";
                resultClass.className = "result-tag warning";
            }
        } catch (error) {
            title.textContent = "Prediction unavailable";
            message.textContent =
                error.message || "Please check that the Flask server is running.";
            resultClass.textContent = "ERROR";
            resultClass.className = "result-tag warning";
        } finally {
            button.disabled = false;
            button.innerHTML = 'Analyse Movie <span>↗</span>';
        }
    });
});
