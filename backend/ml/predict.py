import sys
import os
import joblib
import pandas as pd

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)
parent_dir = os.path.abspath(os.path.join(current_dir, '..'))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

def predict_single_zone(temperature, humidity, wind_speed, rainfall, ndvi, historical_fire_count, elevation, model_path='backend/ml/models/wildfire_model.joblib'):
    """
    Runs prediction for a single environmental feature vector.
    """
    if not os.path.exists(model_path):
        from train import train_wildfire_model
        train_wildfire_model(model_save_path=model_path)
        
    model = joblib.load(model_path)
    
    input_df = pd.DataFrame([{
        'temperature': float(temperature),
        'humidity': float(humidity),
        'wind_speed': float(wind_speed),
        'rainfall': float(rainfall),
        'ndvi': float(ndvi),
        'historical_fire_count': int(historical_fire_count),
        'elevation': float(elevation)
    }])
    
    prob = model.predict_proba(input_df)[0, 1]
    risk_score = round(prob * 100)
    
    if risk_score >= 75:
        risk_level = "CRITICAL"
    elif risk_score >= 50:
        risk_level = "HIGH"
    elif risk_score >= 25:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"
        
    return {
        'risk_score': risk_score,
        'risk_level': risk_level,
        'probability': round(prob, 4)
    }

if __name__ == '__main__':
    # Sample Test Scenario (Critical Fire Weather)
    sample_temp = 41.5
    sample_humidity = 18.0
    sample_wind = 34.0
    sample_rain = 0.0
    sample_ndvi = 0.18
    sample_fires = 12
    sample_elevation = 420.0
    
    result = predict_single_zone(
        sample_temp,
        sample_humidity,
        sample_wind,
        sample_rain,
        sample_ndvi,
        sample_fires,
        sample_elevation
    )
    
    print("\n==================================================")
    print("  🔥 Wildfire Prediction System")
    print("==================================================")
    print(f"Input Conditions:")
    print(f"  - Temperature:           {sample_temp}°C")
    print(f"  - Humidity:              {sample_humidity}%")
    print(f"  - Wind Speed:            {sample_wind} km/h")
    print(f"  - Rainfall:              {sample_rain} mm")
    print(f"  - Vegetation (NDVI):     {sample_ndvi} (Dry Scrub)")
    print(f"  - Historical Fires:      {sample_fires} events")
    print(f"  - Elevation:             {sample_elevation} m")
    print("--------------------------------------------------")
    print(f"Risk Score: {result['risk_score']}%")
    print(f"Risk Level: {result['risk_level']}")
    print("==================================================\n")
