"""
Deploy Inflation Distress model to Azure Machine Learning.

Usage:
    1. Fill in YOUR_SUBSCRIPTION_ID, YOUR_RESOURCE_GROUP, YOUR_WORKSPACE below
    2. Run: az login
    3. Run: python deploy_to_azure_ml.py

Prerequisites:
    pip install azure-ai-ml azure-identity
"""

from azure.ai.ml import MLClient
from azure.ai.ml.entities import (
    ManagedOnlineEndpoint,
    ManagedOnlineDeployment,
    Model,
    Environment,
    CodeConfiguration,
)
from azure.identity import DefaultAzureCredential

# ═══════════════════════════════════════════════════════════
# ⬇️ ISI KONFIGURASI ANDA DI SINI ⬇️
# ═══════════════════════════════════════════════════════════
SUBSCRIPTION_ID = ""   # e.g. "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
RESOURCE_GROUP = ""    # e.g. "dawg-id-rg"
WORKSPACE_NAME = ""    # e.g. "dawg-id-workspace"
# ═══════════════════════════════════════════════════════════

ENDPOINT_NAME = "inflation-distress-endpoint"
DEPLOYMENT_NAME = "inflation-distress-dt"
MODEL_NAME = "inflation-distress-decision-tree"


def main():
    if not SUBSCRIPTION_ID or not RESOURCE_GROUP or not WORKSPACE_NAME:
        print("❌ Isi SUBSCRIPTION_ID, RESOURCE_GROUP, dan WORKSPACE_NAME terlebih dahulu!")
        return

    print("🔐 Authenticating...")
    credential = DefaultAzureCredential()
    ml_client = MLClient(credential, SUBSCRIPTION_ID, RESOURCE_GROUP, WORKSPACE_NAME)

    # 1. Register model
    print("📦 Registering model...")
    model = Model(
        path="./models",
        name=MODEL_NAME,
        description="Decision Tree classifier for inflation distress prediction (DAWG-ID)",
        type="custom_model",
    )
    registered_model = ml_client.models.create_or_update(model)
    print(f"   ✅ Model registered: {registered_model.name} v{registered_model.version}")

    # 2. Create environment
    print("🐍 Creating environment...")
    env = Environment(
        name="inflation-distress-env",
        conda_file="./deploy/conda.yml",
        image="mcr.microsoft.com/azureml/openmpi4.1.0-ubuntu20.04:latest",
    )

    # 3. Create endpoint
    print("🌐 Creating endpoint...")
    endpoint = ManagedOnlineEndpoint(
        name=ENDPOINT_NAME,
        description="DAWG-ID Inflation Distress Prediction",
        auth_mode="key",
    )
    ml_client.online_endpoints.begin_create_or_update(endpoint).result()
    print(f"   ✅ Endpoint created: {ENDPOINT_NAME}")

    # 4. Create deployment
    print("🚀 Deploying model...")
    deployment = ManagedOnlineDeployment(
        name=DEPLOYMENT_NAME,
        endpoint_name=ENDPOINT_NAME,
        model=registered_model,
        environment=env,
        code_configuration=CodeConfiguration(
            code="./deploy",
            scoring_script="score.py",
        ),
        instance_type="Standard_DS1_v2",
        instance_count=1,
    )
    ml_client.online_deployments.begin_create_or_update(deployment).result()
    print(f"   ✅ Deployment created: {DEPLOYMENT_NAME}")

    # 5. Route 100% traffic
    endpoint.traffic = {DEPLOYMENT_NAME: 100}
    ml_client.online_endpoints.begin_create_or_update(endpoint).result()

    # 6. Get endpoint details
    endpoint_info = ml_client.online_endpoints.get(ENDPOINT_NAME)
    keys = ml_client.online_endpoints.get_keys(ENDPOINT_NAME)

    print("\n" + "═" * 60)
    print("✅ DEPLOYMENT BERHASIL!")
    print("═" * 60)
    print(f"Scoring URI : {endpoint_info.scoring_uri}")
    print(f"API Key     : {keys.primary_key}")
    print("═" * 60)
    print("\n📋 Masukkan nilai di atas ke Vercel Environment Variables:")
    print(f"   AZURE_ML_ENDPOINT = {endpoint_info.scoring_uri}")
    print(f"   AZURE_ML_API_KEY  = {keys.primary_key}")


if __name__ == "__main__":
    main()
