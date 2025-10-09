// src/utils/cosineSimilarity.ts

/**
 * Tokenizes a given text by converting to lowercase, removing punctuation,
 * and splitting into words.
 * @param text The input string.
 * @returns An array of words (tokens).
 */
const tokenize = (text: string): string[] => {
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "") // Remove punctuation
    .replace(/\s\s+/g, " ") // Replace multiple spaces with single space
    .trim()
    .split(" ")
    .filter(word => word.length > 0); // Remove empty strings
};

/**
 * Creates a word count vector for a given text based on a vocabulary.
 * @param text The input string.
 * @param vocabulary A map of unique words to their index in the vector.
 * @returns A number array representing the word count vector.
 */
const createVector = (text: string, vocabulary: Map<string, number>): number[] => {
  const tokens = tokenize(text);
  const vector = new Array(vocabulary.size).fill(0);
  for (const token of tokens) {
    if (vocabulary.has(token)) {
      vector[vocabulary.get(token)!]++;
    }
  }
  return vector;
};

/**
 * Calculates the dot product of two vectors.
 * @param vec1 The first vector.
 * @param vec2 The second vector.
 * @returns The dot product.
 */
const dotProduct = (vec1: number[], vec2: number[]): number => {
  let product = 0;
  for (let i = 0; i < vec1.length; i++) {
    product += vec1[i] * vec2[i];
  }
  return product;
};

/**
 * Calculates the magnitude (Euclidean norm) of a vector.
 * @param vec The input vector.
 * @returns The magnitude of the vector.
 */
const magnitude = (vec: number[]): number => {
  let sum = 0;
  for (const val of vec) {
    sum += val * val;
  }
  return Math.sqrt(sum);
};

/**
 * Calculates the cosine similarity between two text inputs.
 * @param text1 The first text input.
 * @param text2 The second text input.
 * @returns The cosine similarity as a percentage (0-100).
 */
export const calculateCosineSimilarity = (text1: string, text2: string): number => {
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);

  // Build a combined vocabulary
  const vocabulary = new Map<string, number>();
  let index = 0;
  for (const token of [...tokens1, ...tokens2]) {
    if (!vocabulary.has(token)) {
      vocabulary.set(token, index++);
    }
  }

  if (vocabulary.size === 0) {
    return 0; // No common words or empty texts
  }

  const vector1 = createVector(text1, vocabulary);
  const vector2 = createVector(text2, vocabulary);

  const dotProd = dotProduct(vector1, vector2);
  const mag1 = magnitude(vector1);
  const mag2 = magnitude(vector2);

  if (mag1 === 0 || mag2 === 0) {
    return 0; // One or both texts are empty or contain only stop words
  }

  const similarity = dotProd / (mag1 * mag2);
  return parseFloat((similarity * 100).toFixed(2)); // Return as percentage, rounded to 2 decimal places
};