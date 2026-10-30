import { MLFeatureInput, MLPredictionResult, MLModelMetrics, RiskLevel } from '../src/types';

// ==========================================
// MATHEMATICAL RANDOM FOREST CLASSIFIER
// ==========================================

export interface TrainingSample {
  features: number[]; // [temp, humidity, wind, rain, ndvi, fire_count, elevation]
  target: number; // 0 or 1
}

interface TreeNode {
  isLeaf: boolean;
  prediction?: number;
  probability?: number;
  featureIndex?: number;
  splitValue?: number;
  left?: TreeNode;
  right?: TreeNode;
  impurity?: number;
}

export class DecisionTree {
  root: TreeNode | null = null;
  maxDepth: number;
  minSamplesSplit: number;
  maxFeatures: number;
  featureImportances: number[] = [0, 0, 0, 0, 0, 0, 0];

  constructor(maxDepth: number = 6, minSamplesSplit: number = 4, maxFeatures: number = 4) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.maxFeatures = maxFeatures;
  }

  private gini(samples: TrainingSample[]): number {
    if (samples.length === 0) return 0;
    const positiveCount = samples.filter((s) => s.target === 1).length;
    const p1 = positiveCount / samples.length;
    const p0 = 1 - p1;
    return 1 - (p0 * p0 + p1 * p1);
  }

  private getBestSplit(samples: TrainingSample[], featureIndices: number[]): {
    bestFeature: number;
    bestValue: number;
    bestGiniGain: number;
    left: TrainingSample[];
    right: TrainingSample[];
  } | null {
    const parentGini = this.gini(samples);
    let bestGain = -1;
    let bestFeature = -1;
    let bestValue = 0;
    let bestLeft: TrainingSample[] = [];
    let bestRight: TrainingSample[] = [];

    for (const featureIndex of featureIndices) {
      const values = samples.map((s) => s.features[featureIndex]).sort((a, b) => a - b);
      const thresholds: number[] = [];
      for (let i = 0; i < values.length - 1; i += Math.max(1, Math.floor(values.length / 12))) {
        thresholds.push((values[i] + values[i + 1]) / 2);
      }

      for (const threshold of thresholds) {
        const left = samples.filter((s) => s.features[featureIndex] <= threshold);
        const right = samples.filter((s) => s.features[featureIndex] > threshold);

        if (left.length === 0 || right.length === 0) continue;

        const pLeft = left.length / samples.length;
        const pRight = right.length / samples.length;
        const weightedGini = pLeft * this.gini(left) + pRight * this.gini(right);
        const gain = parentGini - weightedGini;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = featureIndex;
          bestValue = threshold;
          bestLeft = left;
          bestRight = right;
        }
      }
    }

    if (bestGain <= 0.0001 || bestFeature === -1) return null;

    return {
      bestFeature,
      bestValue,
      bestGiniGain: bestGain,
      left: bestLeft,
      right: bestRight,
    };
  }

  private buildTree(samples: TrainingSample[], depth: number): TreeNode {
    const positiveCount = samples.filter((s) => s.target === 1).length;
    const probability = samples.length > 0 ? positiveCount / samples.length : 0;
    const prediction = probability >= 0.5 ? 1 : 0;

    if (
      depth >= this.maxDepth ||
      samples.length < this.minSamplesSplit ||
      probability === 0 ||
      probability === 1
    ) {
      return {
        isLeaf: true,
        prediction,
        probability,
        impurity: this.gini(samples),
      };
    }

    // Random subset of features
    const allIndices = [0, 1, 2, 3, 4, 5, 6];
    const shuffled = [...allIndices].sort(() => Math.random() - 0.5);
    const chosenIndices = shuffled.slice(0, this.maxFeatures);

    const split = this.getBestSplit(samples, chosenIndices);
    if (!split) {
      return {
        isLeaf: true,
        prediction,
        probability,
        impurity: this.gini(samples),
      };
    }

    // Accumulate feature importance
    this.featureImportances[split.bestFeature] += split.bestGiniGain * (samples.length / 1000);

    const leftNode = this.buildTree(split.left, depth + 1);
    const rightNode = this.buildTree(split.right, depth + 1);

    return {
      isLeaf: false,
      featureIndex: split.bestFeature,
      splitValue: split.bestValue,
      impurity: this.gini(samples),
      left: leftNode,
      right: rightNode,
      probability,
    };
  }

  fit(samples: TrainingSample[]): void {
    this.featureImportances = [0, 0, 0, 0, 0, 0, 0];
    this.root = this.buildTree(samples, 0);
  }

  predictNode(node: TreeNode | null, features: number[]): { prediction: number; probability: number } {
    if (!node) return { prediction: 0, probability: 0 };
    if (node.isLeaf) {
      return { prediction: node.prediction ?? 0, probability: node.probability ?? 0 };
    }
    if (node.featureIndex !== undefined && node.splitValue !== undefined) {
      if (features[node.featureIndex] <= node.splitValue) {
        return this.predictNode(node.left ?? null, features);
      } else {
        return this.predictNode(node.right ?? null, features);
      }
    }
    return { prediction: 0, probability: 0 };
  }
}

export class RandomForestClassifier {
  trees: DecisionTree[] = [];
  nEstimators: number;
  maxDepth: number;
  minSamplesSplit: number;
  featureImportances: number[] = [0, 0, 0, 0, 0, 0, 0];
  metrics: MLModelMetrics | null = null;

  constructor(nEstimators: number = 30, maxDepth: number = 7, minSamplesSplit: number = 4) {
    this.nEstimators = nEstimators;
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  private bootstrapSample(samples: TrainingSample[]): TrainingSample[] {
    const res: TrainingSample[] = [];
    const n = samples.length;
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * n);
      res.push(samples[idx]);
    }
    return res;
  }

  fit(trainingData: TrainingSample[], testData?: TrainingSample[]): MLModelMetrics {
    this.trees = [];
    const accumulatedImportance = [0, 0, 0, 0, 0, 0, 0];

    for (let i = 0; i < this.nEstimators; i++) {
      const tree = new DecisionTree(this.maxDepth, this.minSamplesSplit, 5);
      const bootstrap = this.bootstrapSample(trainingData);
      tree.fit(bootstrap);
      this.trees.push(tree);

      for (let f = 0; f < 7; f++) {
        accumulatedImportance[f] += tree.featureImportances[f];
      }
    }

    // Normalize feature importance
    const totalImportance = accumulatedImportance.reduce((a, b) => a + b, 0) || 1;
    this.featureImportances = accumulatedImportance.map((v) => (v / totalImportance) * 100);

    // Evaluate on test dataset if provided
    const evalData = testData || trainingData;
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let tn = 0;

    for (const item of evalData) {
      const prob = this.predictProbability(item.features);
      const pred = prob >= 0.5 ? 1 : 0;
      if (pred === 1 && item.target === 1) tp++;
      else if (pred === 1 && item.target === 0) fp++;
      else if (pred === 0 && item.target === 1) fn++;
      else tn++;
    }

    const accuracy = (tp + tn) / evalData.length;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    const featureNames = [
      { feature: 'temperature', name: 'Ambient Temperature' },
      { feature: 'humidity', name: 'Relative Humidity' },
      { feature: 'wind_speed', name: 'Wind Velocity' },
      { feature: 'rainfall', name: 'Precipitation / Rainfall' },
      { feature: 'ndvi', name: 'Vegetation Index (NDVI)' },
      { feature: 'historical_fire_count', name: 'Historical Wildfire Frequency' },
      { feature: 'elevation', name: 'Topographic Elevation' },
    ];

    this.metrics = {
      algorithm: 'Random Forest Ensemble (30 Estimators)',
      numberOfTrees: this.nEstimators,
      datasetSize: trainingData.length + (testData ? testData.length : 0),
      trainSamples: trainingData.length,
      testSamples: evalData.length,
      accuracy: Math.round(accuracy * 1000) / 1000,
      precision: Math.round(precision * 1000) / 1000,
      recall: Math.round(recall * 1000) / 1000,
      f1Score: Math.round(f1Score * 1000) / 1000,
      confusionMatrix: {
        truePositive: tp,
        falsePositive: fp,
        falseNegative: fn,
        trueNegative: tn,
      },
      featureImportance: featureNames.map((item, idx) => ({
        feature: item.feature,
        name: item.name,
        importance: Math.round(this.featureImportances[idx] * 10) / 10,
      })).sort((a, b) => b.importance - a.importance),
      trainedAt: new Date().toISOString(),
      isDemoData: true,
    };

    return this.metrics;
  }

  predictProbability(features: number[]): number {
    if (this.trees.length === 0) return 0;
    let sumProb = 0;
    for (const tree of this.trees) {
      const res = tree.predictNode(tree.root, features);
      sumProb += res.probability;
    }
    return sumProb / this.trees.length;
  }
}

// ==========================================
// SYNTHETIC WILDFIRE DATASET GENERATOR
// ==========================================

export function generateSyntheticWildfireDataset(numSamples: number = 2400): {
  train: TrainingSample[];
  test: TrainingSample[];
} {
  const allSamples: TrainingSample[] = [];

  for (let i = 0; i < numSamples; i++) {
    // Generate realistic environmental parameters
    const temp = Math.random() * 32 + 15; // 15°C to 47°C
    const humidity = Math.random() * 85 + 10; // 10% to 95%
    const wind = Math.random() * 55 + 2; // 2 to 57 km/h
    const rain = Math.random() < 0.65 ? 0 : Math.random() * 45; // 0 to 45 mm
    const ndvi = Math.random() * 0.9 - 0.05; // -0.05 to 0.85
    const fireCount = Math.floor(Math.random() * 22); // 0 to 21
    const elevation = Math.random() * 1200 + 150; // 150m to 1350m

    // Calculate realistic fire risk formula based on Fire Weather Index (FWI) principles
    // Higher temp, lower humidity, higher wind, dry fuel (low ndvi), past fire history increases risk
    let riskLogit = -2.8;

    // Temp factor (danger above 35°C, extreme > 42°C)
    riskLogit += (temp - 25) * 0.14;

    // Humidity factor (danger < 30%, extreme < 18%)
    riskLogit -= (humidity - 45) * 0.085;

    // Wind factor (spread speed)
    riskLogit += (wind - 18) * 0.07;

    // Rain factor (heavy suppression)
    riskLogit -= rain * 0.45;

    // NDVI factor (dry cured vegetation NDVI < 0.25 is combustible fuel)
    if (ndvi < 0.25) {
      riskLogit += (0.25 - ndvi) * 3.8;
    } else {
      riskLogit -= (ndvi - 0.25) * 1.5;
    }

    // Historical fire frequency factor
    riskLogit += fireCount * 0.11;

    // Elevation/Slope factor (upslope draft)
    riskLogit += (elevation - 400) * 0.001;

    // Logistic probability
    const trueProb = 1 / (1 + Math.exp(-riskLogit));

    // Label with slight realistic stochastic noise
    const noise = (Math.random() - 0.5) * 0.08;
    const finalProb = Math.max(0, Math.min(1, trueProb + noise));
    const target = finalProb >= 0.52 ? 1 : 0;

    allSamples.push({
      features: [temp, humidity, wind, rain, ndvi, fireCount, elevation],
      target,
    });
  }

  // 80/20 train/test split
  const trainSize = Math.floor(numSamples * 0.8);
  const train = allSamples.slice(0, trainSize);
  const test = allSamples.slice(trainSize);

  return { train, test };
}

// Singleton model instance
let globalRandomForest: RandomForestClassifier | null = null;

export function getTrainedModel(): RandomForestClassifier {
  if (!globalRandomForest) {
    globalRandomForest = new RandomForestClassifier(35, 7, 4);
    const { train, test } = generateSyntheticWildfireDataset(2500);
    globalRandomForest.fit(train, test);
  }
  return globalRandomForest;
}

export function retrainModel(datasetSize: number = 2500): MLModelMetrics {
  globalRandomForest = new RandomForestClassifier(35, 7, 4);
  const { train, test } = generateSyntheticWildfireDataset(datasetSize);
  return globalRandomForest.fit(train, test);
}

// ==========================================
// PREDICTION & EXPLAINABLE AI PIPELINE
// ==========================================

export function predictWildfireRisk(input: MLFeatureInput): MLPredictionResult {
  const model = getTrainedModel();
  const featureVector = [
    input.temperature,
    input.humidity,
    input.wind_speed,
    input.rainfall,
    input.ndvi,
    input.historical_fire_count,
    input.elevation,
  ];

  const rawProbability = model.predictProbability(featureVector);
  const riskScore = Math.round(rawProbability * 100);

  let riskLevel: RiskLevel = 'LOW';
  if (riskScore >= 75) {
    riskLevel = 'CRITICAL';
  } else if (riskScore >= 50) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 25) {
    riskLevel = 'MODERATE';
  } else {
    riskLevel = 'LOW';
  }

  // Compute Explainable Risk Factors
  // Compare each feature against standard baseline safe thresholds
  const factors = [
    {
      feature: 'temperature',
      displayName: 'Ambient Temperature',
      value: Math.round(input.temperature * 10) / 10,
      unit: '°C',
      impactScore: Math.min(100, Math.max(0, Math.round(((input.temperature - 20) / 25) * 100))),
      status: input.temperature >= 40 ? 'CRITICAL' : input.temperature >= 35 ? 'HIGH' : input.temperature >= 28 ? 'MODERATE' : 'LOW',
    },
    {
      feature: 'humidity',
      displayName: 'Relative Humidity',
      value: Math.round(input.humidity * 10) / 10,
      unit: '%',
      // Inverted: lower humidity = higher risk impact
      impactScore: Math.min(100, Math.max(0, Math.round(((80 - input.humidity) / 70) * 100))),
      status: input.humidity <= 20 ? 'CRITICAL' : input.humidity <= 35 ? 'HIGH' : input.humidity <= 50 ? 'MODERATE' : 'PROTECTIVE',
    },
    {
      feature: 'wind_speed',
      displayName: 'Wind Velocity',
      value: Math.round(input.wind_speed * 10) / 10,
      unit: 'km/h',
      impactScore: Math.min(100, Math.max(0, Math.round((input.wind_speed / 50) * 100))),
      status: input.wind_speed >= 35 ? 'CRITICAL' : input.wind_speed >= 25 ? 'HIGH' : input.wind_speed >= 15 ? 'MODERATE' : 'LOW',
    },
    {
      feature: 'ndvi',
      displayName: 'Vegetation Dryness (NDVI)',
      value: Math.round(input.ndvi * 100) / 100,
      unit: 'NDVI',
      impactScore: Math.min(100, Math.max(0, Math.round(((0.6 - input.ndvi) / 0.6) * 100))),
      status: input.ndvi <= 0.2 ? 'CRITICAL' : input.ndvi <= 0.35 ? 'HIGH' : input.ndvi <= 0.5 ? 'MODERATE' : 'PROTECTIVE',
    },
    {
      feature: 'historical_fire_count',
      displayName: 'Historical Fire Frequency',
      value: input.historical_fire_count,
      unit: 'events',
      impactScore: Math.min(100, Math.max(0, Math.round((input.historical_fire_count / 15) * 100))),
      status: input.historical_fire_count >= 10 ? 'CRITICAL' : input.historical_fire_count >= 5 ? 'HIGH' : input.historical_fire_count >= 2 ? 'MODERATE' : 'LOW',
    },
    {
      feature: 'rainfall',
      displayName: 'Recent Precipitation',
      value: Math.round(input.rainfall * 10) / 10,
      unit: 'mm',
      impactScore: input.rainfall > 0 ? Math.max(5, 100 - Math.round(input.rainfall * 12)) : 95,
      status: input.rainfall === 0 ? 'CRITICAL' : input.rainfall < 5 ? 'HIGH' : 'PROTECTIVE',
    },
    {
      feature: 'elevation',
      displayName: 'Topographic Slope/Elevation',
      value: Math.round(input.elevation),
      unit: 'm',
      impactScore: Math.min(100, Math.max(0, Math.round(((input.elevation - 200) / 800) * 100))),
      status: input.elevation >= 750 ? 'HIGH' : input.elevation >= 450 ? 'MODERATE' : 'LOW',
    },
  ];

  // Sort by impact score descending
  factors.sort((a, b) => b.impactScore - a.impactScore);

  return {
    riskScore,
    riskLevel,
    probability: Math.round(rawProbability * 1000) / 1000,
    contributingFactors: factors as any,
    isDemoModel: true,
    modelConfidence: Math.round((0.85 + Math.abs(rawProbability - 0.5) * 0.25) * 100),
    timestamp: new Date().toISOString(),
  };
}
