import os
import pandas as pd
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier, plot_tree
from sklearn.metrics import accuracy_score, confusion_matrix


DATA_PATH = "data/tmdb_5000_movies.csv"


def load_dataset():
    if os.path.exists(DATA_PATH):
        df = pd.read_csv(DATA_PATH)

        required = ["budget", "revenue", "vote_average"]
        df = df.dropna(subset=required)

        df = df[
            (df["budget"] > 0) &
            (df["revenue"] > 0)
        ].copy()

        df["roi"] = (
            (df["revenue"] - df["budget"]) / df["budget"]
        ) * 100

        df["success"] = (df["roi"] >= 50).astype(int)

        return df

    # Demo data is used only when the real dataset is absent.
    return pd.DataFrame({
        "budget": [
            10, 20, 30, 50, 80, 100, 15, 25,
            40, 60, 90, 120, 12, 35, 70, 110
        ],
        "revenue": [
            80, 50, 60, 70, 100, 130, 90, 100,
            100, 120, 150, 180, 60, 110, 140, 160
        ],
        "vote_average": [
            8, 6, 5, 5, 6, 7, 8, 7,
            6, 7, 8, 8, 7, 8, 7, 6
        ],
        "runtime": [
            120, 110, 130, 140, 150, 160, 125, 135,
            145, 155, 165, 170, 115, 140, 150, 160
        ]
    }).assign(
        roi=lambda d: (
            (d["revenue"] - d["budget"]) / d["budget"]
        ) * 100
    ).assign(
        success=lambda d: (d["roi"] >= 50).astype(int)
    )


def train_model():
    df = load_dataset()

    features = ["budget", "vote_average", "runtime"]
    X = df[features]
    y = df["success"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.25,
        random_state=42,
        stratify=y
    )

    model = DecisionTreeClassifier(
        criterion="entropy",
        max_depth=4,
        random_state=42
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    matrix = confusion_matrix(
        y_test, predictions, labels=[0, 1]
    )

    os.makedirs("static", exist_ok=True)

    plt.figure(figsize=(16, 8))
    plot_tree(
        model,
        feature_names=features,
        class_names=["Not Successful", "Successful"],
        filled=True,
        rounded=True
    )
    plt.tight_layout()
    plt.savefig("static/decision_tree.png", dpi=150)
    plt.close()

    return {
        "model": model,
        "accuracy": round(accuracy * 100, 2),
        "confusion_matrix": matrix.tolist(),
        "dataset_size": len(df),
        "features": features,
        "demo_data": not os.path.exists(DATA_PATH)
    }
