
from model_utils import train_model


if __name__ == "__main__":
    result = train_model()

    print("\n===== CineMind AI Model Results =====")
    print("Dataset size:", result["dataset_size"])
    print("Model accuracy:", result["accuracy"], "%")
    print("Confusion matrix:")
    print(result["confusion_matrix"])

    if result["demo_data"]:
        print("\nNOTE: Demo data is being used.")
        print("Add the historical movie dataset for real evaluation.")
    else:
        print("\nHistorical movie dataset loaded successfully.")

    print("\nDecision Tree saved to static/decision_tree.png")
