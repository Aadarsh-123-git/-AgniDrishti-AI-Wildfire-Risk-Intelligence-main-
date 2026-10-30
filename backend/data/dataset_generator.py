import numpy as np
import pandas as pd
import os

def generate_wildfire_dataset(n_samples=5000, random_state=42):
    """
    Generates a physically consistent synthetic wildfire training dataset.
    Features:
      - temperature (°C): 15 to 48
      - humidity (%): 10 to 95
      - wind_speed (km/h): 2 to 60
      - rainfall (mm): 0 to 50
      - ndvi (-0.1 to 0.85): Normalized Difference Vegetation Index
      - historical_fire_count (0 to 25): Past fire records
      - elevation (m): 150 to 1400
    Target:
      - wildfire_occurrence (0 or 1)
    """
    np.random.seed(random_state)
    
    temp = np.random.uniform(15, 48, n_samples)
    humidity = np.random.uniform(10, 95, n_samples)
    wind_speed = np.random.uniform(2, 60, n_samples)
    
    # 65% zero rain days in dry season
    rain_mask = np.random.rand(n_samples) > 0.35
    rainfall = np.where(rain_mask, np.random.exponential(4.5, n_samples), 0.0)
    
    ndvi = np.random.uniform(-0.05, 0.85, n_samples)
    hist_fires = np.random.poisson(3.8, n_samples)
    elevation = np.random.uniform(150, 1400, n_samples)
    
    # Fire Weather Index / McArthur style risk calculation
    risk_logit = -2.8
    risk_logit += (temp - 25.0) * 0.14
    risk_logit -= (humidity - 45.0) * 0.085
    risk_logit += (wind_speed - 18.0) * 0.070
    risk_logit -= rainfall * 0.45
    risk_logit += np.where(ndvi < 0.25, (0.25 - ndvi) * 3.8, -(ndvi - 0.25) * 1.5)
    risk_logit += hist_fires * 0.11
    risk_logit += (elevation - 400.0) * 0.001
    
    true_prob = 1.0 / (1.0 + np.exp(-risk_logit))
    
    # Add slight stochastic noise for realistic boundary fuzziness
    noise = np.random.normal(0, 0.06, n_samples)
    final_prob = np.clip(true_prob + noise, 0, 1)
    
    wildfire_target = (final_prob >= 0.52).astype(int)
    
    df = pd.DataFrame({
        'temperature': np.round(temp, 1),
        'humidity': np.round(humidity, 1),
        'wind_speed': np.round(wind_speed, 1),
        'rainfall': np.round(rainfall, 1),
        'ndvi': np.round(ndvi, 3),
        'historical_fire_count': hist_fires,
        'elevation': np.round(elevation, 0).astype(int),
        'wildfire_occurrence': wildfire_target
    })
    
    return df

if __name__ == '__main__':
    os.makedirs('backend/data/raw', exist_ok=True)
    os.makedirs('backend/data/processed', exist_ok=True)
    
    df = generate_wildfire_dataset(5000)
    output_path = 'backend/data/raw/synthetic_wildfire_data.csv'
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} synthetic wildfire training samples at {output_path}")
    print(f"Wildfire Positive Class Ratio: {df['wildfire_occurrence'].mean():.2%}")
