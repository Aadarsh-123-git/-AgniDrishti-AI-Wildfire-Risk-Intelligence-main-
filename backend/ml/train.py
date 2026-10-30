import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)
parent_dir = os.path.abspath(os.path.join(current_dir, '..'))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)
from data.dataset_generator import generate_wildfire_dataset

def train_wildfire_model(n_samples=5000, model_save_path='backend/ml/models/wildfire_model.joblib'):
    print("==================================================")
    print("  🔥 WildfireAI — ML Model Training Pipeline")
    print("==================================================")
    
    # 1. Generate/Load Dataset
    print(f"[1/5] Synthesizing physical wildfire training dataset ({n_samples} samples)...")
    df = generate_wildfire_dataset(n_samples)
    
    feature_cols = [
        'temperature',
        'humidity',
        'wind_speed',
        'rainfall',
        'ndvi',
        'historical_fire_count',
        'elevation'
    ]
    X = df[feature_cols]
    y = df['wildfire_occurrence']
    
    # 2. Train-Test Split
    print("[2/5] Splitting dataset into Train (80%) and Test (20%)...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # 3. Train Random Forest Classifier
    print("[3/5] Fitting Random Forest Classifier (n_estimators=100, max_depth=8)...")
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train, y_train)
    
    # 4. Evaluation
    print("[4/5] Evaluating model performance on held-out test split...")
    y_pred = rf.predict(X_test)
    y_prob = rf.predict_proba(X_test)[:, 1]
    
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)
    
    print("\n--- MODEL PERFORMANCE METRICS (DEMO / SYNTHETIC DATA) ---")
    print(f"Accuracy:  {acc:.4f} ({acc*100:.2f}%)")
    print(f"Precision: {prec:.4f} ({prec*100:.2f}%)")
    print(f"Recall:    {rec:.4f} ({rec*100:.2f}%)")
    print(f"F1 Score:  {f1:.4f}")
    print("\nConfusion Matrix:")
    print(f"  TN: {cm[0,0]} | FP: {cm[0,1]}")
    print(f"  FN: {cm[1,0]} | TP: {cm[1,1]}")
    
    print("\nFeature Importances:")
    for col, imp in sorted(zip(feature_cols, rf.feature_importances_), key=lambda x: x[1], reverse=True):
        print(f"  - {col.ljust(22)}: {imp*100:.2f}%")
        
    # 5. Save Model Artifact
    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    joblib.dump(rf, model_save_path)
    print(f"\n[5/5] Model saved successfully to: {model_save_path}")
    print("==================================================")
    
    return rf

if __name__ == '__main__':
    train_wildfire_model()
