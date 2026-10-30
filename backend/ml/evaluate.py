import os
import joblib
import pandas as pd
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)
parent_dir = os.path.abspath(os.path.join(current_dir, '..'))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)
from data.dataset_generator import generate_wildfire_dataset

def evaluate_saved_model(model_path='backend/ml/models/wildfire_model.joblib'):
    if not os.path.exists(model_path):
        print(f"Model file not found at {model_path}. Training a new baseline...")
        from train import train_wildfire_model
        train_wildfire_model(model_save_path=model_path)
        
    model = joblib.load(model_path)
    print("Generating independent 2,000-sample test batch...")
    test_df = generate_wildfire_dataset(2000, random_state=999)
    
    feature_cols = ['temperature', 'humidity', 'wind_speed', 'rainfall', 'ndvi', 'historical_fire_count', 'elevation']
    X = test_df[feature_cols]
    y = test_df['wildfire_occurrence']
    
    y_pred = model.predict(X)
    y_prob = model.predict_proba(X)[:, 1]
    
    auc = roc_auc_score(y, y_prob)
    cm = confusion_matrix(y, y_pred)
    
    print("\n==================================================")
    print("  🔥 WildfireAI — Model Evaluation Report")
    print("  (DEMO / SYNTHETIC DATASET)")
    print("==================================================")
    print(f"ROC-AUC Score: {auc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y, y_pred, target_names=['No Fire (0)', 'Wildfire (1)']))
    print("Confusion Matrix:")
    print(f"  [TN: {cm[0,0]}  FP: {cm[0,1]}]")
    print(f"  [FN: {cm[1,0]}  TP: {cm[1,1]}]")
    print("==================================================\n")

if __name__ == '__main__':
    evaluate_saved_model()
