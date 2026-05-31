"""Scoring script for Azure ML managed endpoint."""

import json
import os
import joblib
import numpy as np


def init():
    global model, feature_columns
    model_dir = os.getenv("AZUREML_MODEL_DIR")
    model = joblib.load(os.path.join(model_dir, "inflation_distress_decision_tree.joblib"))
    with open(os.path.join(model_dir, "inflation_distress_feature_columns.json")) as f:
        feature_columns = json.load(f)


def run(raw_data):
    data = json.loads(raw_data)
    input_data = data.get("input_data", data)

    # Support single dict or list of dicts
    if isinstance(input_data, dict):
        input_data = [input_data]

    results = []
    for row in input_data:
        features = np.array([[row.get(col, 0) for col in feature_columns]])
        pred = model.predict(features)[0]
        prob = model.predict_proba(features)[0][1]
        results.append({
            "distress": int(pred),
            "probability": round(float(prob), 4),
            "label": "High Inflation Risk" if pred == 1 else "Normal",
        })

    return results if len(results) > 1 else results[0]
