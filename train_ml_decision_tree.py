"""
Train a Decision Tree inflation-distress classifier and save SHAP artifacts.

The model uses real 2024 province-month inflation observations plus the
existing structural vulnerability features and monthly macro shock series.
It predicts whether a province-month inflation MoM value is in the top quartile
of the observed 2024 distribution.
"""

from __future__ import annotations

import json
import os
import site
import sys
from pathlib import Path

USER_SITE = site.getusersitepackages()


def add_dependency_path(path: Path) -> None:
    """Add a local dependency directory only if Python can read it."""
    try:
        if not path.exists():
            return
        matplotlib_dir = path / "matplotlib"
        if matplotlib_dir.exists():
            os.listdir(matplotlib_dir)
        if str(path) not in sys.path:
            sys.path.insert(0, str(path))
    except OSError:
        return


for local_deps in reversed(
    (
        Path(r"C:\tmp\project_hormuz_ml_deps2"),
        Path(r"C:\tmp\project_hormuz_ml_deps"),
        Path(__file__).resolve().parent / ".ml_deps",
        Path(__file__).resolve().parent / ".codex_deps",
    )
):
    add_dependency_path(local_deps)
if USER_SITE and USER_SITE not in sys.path:
    sys.path.append(USER_SITE)

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    make_scorer,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.tree import DecisionTreeClassifier, export_text, plot_tree

import prototype_lib as pl


BASE_DIR = Path(__file__).resolve().parent
RAW = BASE_DIR / "data" / "raw"
PROCESSED = BASE_DIR / "data" / "processed"
OUTPUTS = BASE_DIR / "outputs"
MODELS = BASE_DIR / "models"

STRUCTURAL_FEATURES = [
    "hhi_sectoral",
    "export_intensity",
    "migas_share",
    "resilience",
]

SHOCK_FEATURES = [
    "d_log_brent",
    "d_log_usd_idr",
    "d_log_wti",
    "d_log_coal",
    "d_log_palm_oil",
    "d_log_nickel",
    "d_log_tin",
]

INTERACTION_FEATURES = [
    "migas_share_x_d_log_brent",
    "export_intensity_x_d_log_usd_idr",
    "resilience_x_d_log_usd_idr",
]

FEATURE_COLUMNS = STRUCTURAL_FEATURES + SHOCK_FEATURES + INTERACTION_FEATURES


def ensure_dirs() -> None:
    for path in (PROCESSED, OUTPUTS, MODELS):
        path.mkdir(parents=True, exist_ok=True)


def load_structural_features() -> pd.DataFrame:
    features_path = PROCESSED / "vulnerability_features.csv"
    if features_path.exists():
        features = pd.read_csv(features_path)
        required = {"province", *STRUCTURAL_FEATURES}
        missing = required - set(features.columns)
        if missing:
            raise ValueError(f"{features_path} missing required columns: {sorted(missing)}")
        return features[["province", *STRUCTURAL_FEATURES]].copy()

    pdrb = pl.load_bps_csv(RAW / "bps" / "bps_pdrb_adhb_quarterly.csv")
    exp_migas = pl.load_bps_csv(RAW / "bps" / "bps_export_migas.csv")
    exp_nonmigas = pl.load_bps_csv(RAW / "bps" / "bps_export_nonmigas.csv")
    inflation_mom = pl.load_bps_csv(RAW / "bps" / "bps_inflation_mom.csv")
    poverty_p1 = pl.load_bps_csv(RAW / "bps" / "bps_poverty_depth_p1.csv")
    gini = pl.load_bps_csv(RAW / "bps" / "bps_gini.csv")
    emp_status = pl.load_bps_csv(RAW / "bps" / "bps_employment_by_status.csv")
    commodity_panel = pl.load_commodity_panel(RAW)

    hhi = pl.compute_hhi(pdrb)
    exp_feats = pl.compute_export_features(exp_migas, exp_nonmigas, pdrb)
    betas = pl.compute_betas(inflation_mom, commodity_panel)
    resilience = pl.compute_resilience(poverty_p1, gini, emp_status)
    features = pl.build_features_table(hhi, exp_feats, betas, resilience)
    return features.reset_index()[["province", *STRUCTURAL_FEATURES]].copy()


def build_monthly_shocks(commodity_panel: pd.DataFrame) -> pd.DataFrame:
    rename_map = {
        "brent": "d_log_brent",
        "usd_idr": "d_log_usd_idr",
        "wti": "d_log_wti",
        "coal": "d_log_coal",
        "palm_oil": "d_log_palm_oil",
        "nickel": "d_log_nickel",
        "tin": "d_log_tin",
    }

    shocks = np.log(commodity_panel[list(rename_map)]).diff().rename(columns=rename_map)
    shocks = shocks.reset_index()
    shocks["date"] = pd.to_datetime(shocks["date"])
    shocks[SHOCK_FEATURES] = shocks[SHOCK_FEATURES].replace([np.inf, -np.inf], np.nan)
    return shocks[["date", *SHOCK_FEATURES]]


def add_interactions(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["migas_share_x_d_log_brent"] = out["migas_share"] * out["d_log_brent"]
    out["export_intensity_x_d_log_usd_idr"] = (
        out["export_intensity"] * out["d_log_usd_idr"]
    )
    out["resilience_x_d_log_usd_idr"] = out["resilience"] * out["d_log_usd_idr"]
    return out


def build_ml_panel() -> pd.DataFrame:
    inflation = pl.load_bps_csv(RAW / "bps" / "bps_inflation_mom.csv")
    inflation = inflation[inflation["area_type"].str.lower().eq("tidak ada")].copy()
    inflation = inflation.dropna(subset=["date", "value"])
    inflation["date"] = pd.to_datetime(inflation["date"])
    inflation = inflation[["province", "date", "year", "period", "value"]].rename(
        columns={"value": "inflation_mom"}
    )

    structural = load_structural_features()
    shocks = build_monthly_shocks(pl.load_commodity_panel(RAW))
    panel = inflation.merge(structural, on="province", how="left").merge(
        shocks, on="date", how="left"
    )

    base_features = STRUCTURAL_FEATURES + SHOCK_FEATURES
    panel[base_features] = panel[base_features].replace([np.inf, -np.inf], np.nan)
    panel[base_features] = panel[base_features].fillna(panel[base_features].median())
    panel = add_interactions(panel)
    panel[FEATURE_COLUMNS] = panel[FEATURE_COLUMNS].replace([np.inf, -np.inf], np.nan)
    panel[FEATURE_COLUMNS] = panel[FEATURE_COLUMNS].fillna(panel[FEATURE_COLUMNS].median())

    threshold = panel["inflation_mom"].quantile(0.75)
    panel["inflation_distress"] = (panel["inflation_mom"] >= threshold).astype(int)
    panel["distress_threshold"] = threshold
    return panel.sort_values(["date", "province"]).reset_index(drop=True)


def train_model(panel: pd.DataFrame) -> tuple[DecisionTreeClassifier, dict, pd.DataFrame]:
    x = panel[FEATURE_COLUMNS]
    y = panel["inflation_distress"]
    stratify = y if y.nunique() == 2 and y.value_counts().min() >= 2 else None
    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.25, random_state=42, stratify=stratify
    )

    base_model = DecisionTreeClassifier(random_state=42)
    param_grid = {
        "criterion": ["gini", "entropy"],
        "max_depth": [2, 3, 4, 5, None],
        "min_samples_leaf": [5, 10, 15, 20],
        "min_samples_split": [10, 20, 40, 60],
        "class_weight": [None, "balanced"],
        "max_features": [None, "sqrt"],
    }
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    search = GridSearchCV(
        estimator=base_model,
        param_grid=param_grid,
        scoring={
            "f1": "f1",
            "roc_auc": "roc_auc",
            "precision": make_scorer(precision_score, zero_division=0),
            "recall": "recall",
            "accuracy": "accuracy",
        },
        refit="f1",
        cv=cv,
        n_jobs=-1,
        return_train_score=True,
    )
    search.fit(x_train, y_train)
    model = search.best_estimator_

    y_pred = model.predict(x_test)
    y_prob = model.predict_proba(x_test)[:, 1]
    metrics = {
        "model": "DecisionTreeClassifier",
        "model_params": model.get_params(),
        "tuning": {
            "method": "GridSearchCV",
            "refit_metric": "f1",
            "cv_folds": 5,
            "n_candidates": int(len(search.cv_results_["params"])),
            "best_params": search.best_params_,
            "best_cv_f1": float(search.best_score_),
            "best_cv_roc_auc": float(search.cv_results_["mean_test_roc_auc"][search.best_index_]),
            "best_cv_precision": float(search.cv_results_["mean_test_precision"][search.best_index_]),
            "best_cv_recall": float(search.cv_results_["mean_test_recall"][search.best_index_]),
            "best_cv_accuracy": float(search.cv_results_["mean_test_accuracy"][search.best_index_]),
        },
        "n_rows": int(len(panel)),
        "n_train": int(len(x_train)),
        "n_test": int(len(x_test)),
        "positive_rate": float(y.mean()),
        "distress_threshold": float(panel["distress_threshold"].iloc[0]),
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "f1": float(f1_score(y_test, y_pred, zero_division=0)),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        "train_test_split": {
            "test_size": 0.25,
            "random_state": 42,
            "stratified": stratify is not None,
        },
        "feature_columns": FEATURE_COLUMNS,
    }
    try:
        metrics["roc_auc"] = float(roc_auc_score(y_test, y_prob))
    except ValueError:
        metrics["roc_auc"] = None

    cv_results = pd.DataFrame(search.cv_results_)
    cv_results["params_json"] = cv_results["params"].apply(
        lambda params: json.dumps(params, sort_keys=True)
    )
    cv_results = cv_results.sort_values(
        ["rank_test_f1", "rank_test_roc_auc", "rank_test_recall"]
    ).reset_index(drop=True)
    return model, metrics, cv_results


def build_scenario_rows(structural: pd.DataFrame) -> pd.DataFrame:
    shock_defaults = {
        "Base": {"d_log_brent": 0.00, "d_log_usd_idr": 0.00, "multiplier": 1.0},
        "Adverse": {"d_log_brent": np.log1p(0.20), "d_log_usd_idr": np.log1p(0.03), "multiplier": 1.5},
        "Severe": {"d_log_brent": np.log1p(0.40), "d_log_usd_idr": np.log1p(0.06), "multiplier": 2.0},
    }
    rows = []
    for _, province_row in structural.iterrows():
        base = province_row.to_dict()
        for scenario, params in shock_defaults.items():
            row = dict(base)
            row["scenario"] = scenario
            row["scenario_multiplier"] = params["multiplier"]
            for col in SHOCK_FEATURES:
                row[col] = 0.0
            row["d_log_brent"] = params["d_log_brent"]
            row["d_log_wti"] = params["d_log_brent"]
            row["d_log_usd_idr"] = params["d_log_usd_idr"]
            row["d_log_coal"] = params["d_log_brent"] * 0.35
            row["d_log_palm_oil"] = params["d_log_brent"] * 0.20
            row["d_log_nickel"] = params["d_log_usd_idr"] * 0.50
            row["d_log_tin"] = params["d_log_usd_idr"] * 0.50
            rows.append(row)

    scenario_df = add_interactions(pd.DataFrame(rows))
    scenario_df[FEATURE_COLUMNS] = scenario_df[FEATURE_COLUMNS].fillna(
        scenario_df[FEATURE_COLUMNS].median()
    )
    return scenario_df


def positive_class_shap_values(explainer, shap_values, n_rows: int) -> np.ndarray:
    if isinstance(shap_values, list):
        return np.asarray(shap_values[1])
    arr = np.asarray(shap_values)
    if arr.ndim == 3:
        if arr.shape[2] > 1:
            return arr[:, :, 1]
        return arr[:, :, 0]
    if arr.ndim == 2:
        return arr
    raise ValueError(f"Unexpected SHAP values shape: {arr.shape}")


def build_shap_outputs(
    model: DecisionTreeClassifier,
    scenario_df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    x_scenario = scenario_df[FEATURE_COLUMNS]
    explainer = shap.TreeExplainer(model)
    shap_raw = positive_class_shap_values(
        explainer, explainer.shap_values(x_scenario), len(x_scenario)
    )

    shap_rows = []
    for row_idx, row in scenario_df.reset_index(drop=True).iterrows():
        for feature_idx, feature_name in enumerate(FEATURE_COLUMNS):
            shap_value = float(shap_raw[row_idx, feature_idx])
            shap_rows.append(
                {
                    "province": row["province"],
                    "scenario": row["scenario"],
                    "feature": feature_name,
                    "feature_value": float(row[feature_name]),
                    "shap_value": shap_value,
                    "abs_shap_value": abs(shap_value),
                }
            )
    shap_df = pd.DataFrame(shap_rows)
    shap_df["rank"] = shap_df.groupby(["province", "scenario"])["abs_shap_value"].rank(
        ascending=False, method="first"
    ).astype(int)
    top_drivers = shap_df[shap_df["rank"] <= 3].sort_values(
        ["scenario", "province", "rank"]
    )

    global_importance = (
        shap_df.groupby("feature", as_index=False)["abs_shap_value"]
        .mean()
        .sort_values("abs_shap_value", ascending=False)
        .reset_index(drop=True)
    )
    global_importance["rank"] = np.arange(1, len(global_importance) + 1)
    return shap_df, top_drivers, global_importance


def save_tree_artifacts(model: DecisionTreeClassifier) -> None:
    tree_txt = export_text(model, feature_names=FEATURE_COLUMNS, decimals=4)
    (OUTPUTS / "decision_tree_structure.txt").write_text(tree_txt, encoding="utf-8")

    tree = model.tree_
    nodes = []
    for node_id in range(tree.node_count):
        feature_idx = int(tree.feature[node_id])
        nodes.append(
            {
                "node_id": node_id,
                "feature": None if feature_idx < 0 else FEATURE_COLUMNS[feature_idx],
                "threshold": None if feature_idx < 0 else float(tree.threshold[node_id]),
                "left_child": int(tree.children_left[node_id]),
                "right_child": int(tree.children_right[node_id]),
                "impurity": float(tree.impurity[node_id]),
                "n_node_samples": int(tree.n_node_samples[node_id]),
                "weighted_n_node_samples": float(tree.weighted_n_node_samples[node_id]),
                "class_counts": tree.value[node_id][0].astype(float).tolist(),
                "predicted_class": int(np.argmax(tree.value[node_id][0])),
            }
        )
    tree_json = {
        "feature_columns": FEATURE_COLUMNS,
        "classes": model.classes_.astype(int).tolist(),
        "nodes": nodes,
    }
    (OUTPUTS / "decision_tree_structure.json").write_text(
        json.dumps(tree_json, indent=2), encoding="utf-8"
    )

    fig, ax = plt.subplots(figsize=(18, 9))
    plot_tree(
        model,
        feature_names=FEATURE_COLUMNS,
        class_names=["not_distress", "distress"],
        filled=True,
        rounded=True,
        impurity=True,
        proportion=True,
        fontsize=8,
        ax=ax,
    )
    ax.set_title("Decision Tree: Inflation Distress Classifier", fontweight="bold")
    fig.tight_layout()
    fig.savefig(OUTPUTS / "decision_tree_plot.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def save_shap_visuals(global_importance: pd.DataFrame, top_drivers: pd.DataFrame) -> None:
    plt.style.use("seaborn-v0_8-whitegrid")
    top_global = global_importance.head(12).sort_values("abs_shap_value")
    fig, ax = plt.subplots(figsize=(9, 6))
    bars = ax.barh(top_global["feature"], top_global["abs_shap_value"], color="#4C72B0")
    ax.set_title("Global SHAP Importance: Inflation Distress Tree", fontweight="bold")
    ax.set_xlabel("Mean absolute SHAP value")
    ax.set_ylabel("")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    for bar in bars:
        width = bar.get_width()
        ax.text(width + 0.001, bar.get_y() + bar.get_height() / 2, f"{width:.3f}", va="center")
    fig.tight_layout()
    fig.savefig(OUTPUTS / "shap_global_importance.png", dpi=160, bbox_inches="tight")
    plt.close(fig)

    severe_top = (
        top_drivers[top_drivers["scenario"] == "Severe"]
        .groupby("feature", as_index=False)["abs_shap_value"]
        .mean()
        .sort_values("abs_shap_value", ascending=False)
        .head(10)
        .sort_values("abs_shap_value")
    )
    fig, ax = plt.subplots(figsize=(9, 5.5))
    bars = ax.barh(severe_top["feature"], severe_top["abs_shap_value"], color="#DD8452")
    ax.set_title("Top Scenario SHAP Drivers: Severe Scenario", fontweight="bold")
    ax.set_xlabel("Mean absolute SHAP value among top-3 local drivers")
    ax.set_ylabel("")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    for bar in bars:
        width = bar.get_width()
        ax.text(width + 0.001, bar.get_y() + bar.get_height() / 2, f"{width:.3f}", va="center")
    fig.tight_layout()
    fig.savefig(OUTPUTS / "shap_top_scenario_drivers.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    ensure_dirs()

    panel = build_ml_panel()
    panel.to_csv(PROCESSED / "ml_inflation_panel.csv", index=False)

    model, metrics, cv_results = train_model(panel)
    joblib.dump(model, MODELS / "inflation_distress_decision_tree.joblib")
    (MODELS / "inflation_distress_feature_columns.json").write_text(
        json.dumps(FEATURE_COLUMNS, indent=2), encoding="utf-8"
    )
    (MODELS / "inflation_distress_metrics.json").write_text(
        json.dumps(metrics, indent=2), encoding="utf-8"
    )
    (MODELS / "inflation_distress_best_params.json").write_text(
        json.dumps(metrics["tuning"]["best_params"], indent=2), encoding="utf-8"
    )
    cv_results.to_csv(MODELS / "inflation_distress_tuning_results.csv", index=False)

    structural = load_structural_features()
    scenario_df = build_scenario_rows(structural)
    probs = model.predict_proba(scenario_df[FEATURE_COLUMNS])[:, 1]
    scenario_df["distress_probability"] = probs
    scenario_df["predicted_distress"] = model.predict(scenario_df[FEATURE_COLUMNS])
    scenario_df["rank"] = scenario_df.groupby("scenario")["distress_probability"].rank(
        ascending=False, method="min"
    ).astype(int)
    scenario_df = scenario_df.sort_values(["scenario", "rank", "province"]).reset_index(drop=True)
    scenario_df.to_csv(PROCESSED / "ml_scenario_predictions.csv", index=False)

    shap_df, top_drivers, global_importance = build_shap_outputs(model, scenario_df)
    shap_df.to_csv(PROCESSED / "ml_shap_values.csv", index=False)
    top_drivers.to_csv(PROCESSED / "ml_shap_top_drivers.csv", index=False)
    global_importance.to_csv(PROCESSED / "ml_shap_global_importance.csv", index=False)

    save_tree_artifacts(model)
    save_shap_visuals(global_importance, top_drivers)

    reloaded = joblib.load(MODELS / "inflation_distress_decision_tree.joblib")
    _ = reloaded.predict(scenario_df[FEATURE_COLUMNS].head(3))

    print("Decision Tree + SHAP run complete")
    print(f"ML panel rows: {len(panel)}")
    print(f"Scenario prediction rows: {len(scenario_df)}")
    print(f"SHAP value rows: {len(shap_df)}")
    print(f"Top SHAP driver rows: {len(top_drivers)}")
    print(f"Best params: {metrics['tuning']['best_params']}")
    print(f"Best CV F1: {metrics['tuning']['best_cv_f1']:.3f}")
    print(f"F1: {metrics['f1']:.3f} | ROC-AUC: {metrics['roc_auc']}")


if __name__ == "__main__":
    main()
