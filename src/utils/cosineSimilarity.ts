// src/utils/cosineSimilarity.ts

const stopwords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "if", "in", "into", "is", "it", "no", "not", "of", "on", "or", "such", "that", "the", "their", "then", "there", "these", "they", "this", "to", "was", "will", "with", "he", "she", "him", "her", "his", "its", "we", "us", "our", "you", "your", "yours", "i", "me", "my", "mine", "them", "their", "theirs", "what", "when", "where", "who", "whom", "whose", "which", "why", "how", "am", "do", "does", "did", "done", "had", "has", "have", "having", "is", "was", "were", "been", "being", "can", "could", "should", "would", "may", "might", "must", "shall", "will", "go", "goes", "went", "going", "get", "gets", "got", "getting", "make", "makes", "made", "making", "say", "says", "said", "saying", "see", "sees", "saw", "seeing", "take", "takes", "took", "taking", "come", "comes", "came", "coming", "know", "knows", "knew", "knowing", "think", "thinks", "thought", "thinking", "look", "looks", "looked", "looking", "want", "wants", "wanted", "wanting", "give", "gives", "gave", "giving", "use", "uses", "used", "using", "find", "finds", "found", "finding", "tell", "tells", "told", "telling", "ask", "asks", "asked", "asking", "work", "works", "worked", "working", "seem", "seems", "seemed", "seeming", "feel", "feels", "felt", "feeling", "try", "tries", "tried", "trying", "leave", "leaves", "left", "leaving", "call", "calls", "called", "calling", "also", "always", "often", "usually", "sometimes", "never", "ever", "just", "still", "already", "yet", "even", "much", "many", "more", "most", "less", "least", "only", "very", "too", "so", "then", "than", "though", "although", "while", "whereas", "unless", "until", "since", "because", "before", "after", "above", "below", "down", "up", "out", "off", "on", "in", "over", "under", "again", "further", "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now"
]);

/**
 * Tokenizes a given text by converting to lowercase, removing punctuation,
 * and splitting into words. Filters out common English stopwords.
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
    .filter(word => word.length > 0 && !stopwords.has(word)); // Filter stopwords
};

/**
 * Calculates the term frequency (TF) for each term in a document.
 * @param tokens An array of tokens (words) from a document.
 * @returns A Map where keys are terms and values are their frequencies.
 */
const calculateTermFrequency = (tokens: string[]): Map<string, number> => {
  const tf = new Map<string, number>();
  tokens.forEach(token => {
    tf.set(token, (tf.get(token) || 0) + 1);
  });
  return tf;
};

/**
 * Calculates the inverse document frequency (IDF) for each term across a collection of documents.
 * @param allTokens An array of tokenized documents (each element is an array of tokens).
 * @param vocabulary A Map of all unique terms to their index in the vector.
 * @returns A Map where keys are terms and values are their IDF scores.
 */
const calculateInverseDocumentFrequency = (
  allTokens: string[][], // Array of tokenized documents
  vocabulary: Map<string, number>
): Map<string, number> => {
  const idf = new Map<string, number>();
  const numDocuments = allTokens.length;

  vocabulary.forEach((value, term) => {
    let documentCount = 0;
    for (const tokens of allTokens) {
      if (tokens.includes(term)) {
        documentCount++;
      }
    }
    // Add 1 to the denominator to avoid division by zero for terms not in any document
    // and to smooth the IDF calculation.
    idf.set(term, Math.log(numDocuments / (documentCount + 1)));
  });
  return idf;
};

/**
 * Creates a TF-IDF vector for a given document.
 * @param tokens An array of tokens from the document.
 * @param tfMap A Map of term frequencies for the document.
 * @param idfMap A Map of inverse document frequencies for all terms.
 * @param vocabulary A Map of all unique terms to their index in the vector.
 * @returns A number array representing the TF-IDF vector.
 */
const createTfidfVector = (
  tokens: string[],
  tfMap: Map<string, number>,
  idfMap: Map<string, number>,
  vocabulary: Map<string, number>
): number[] => {
  const vector = new Array(vocabulary.size).fill(0);
  const totalTermsInDoc = tokens.length;

  vocabulary.forEach((index, term) => {
    // Calculate normalized TF: (term count in doc) / (total terms in doc)
    const tf = (tfMap.get(term) || 0) / totalTermsInDoc;
    const idf = idfMap.get(term) || 0;
    vector[index] = tf * idf;
  });
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
 * Calculates the cosine similarity between two text inputs using TF-IDF vectorization.
 * @param text1 The first text input (e.g., job description).
 * @param text2 The second text input (e.g., portfolio text).
 * @returns The cosine similarity as a percentage (0-100), rounded to 2 decimal places.
 */
export const calculateCosineSimilarity = (text1: string, text2: string): number => {
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);

  // Build a combined vocabulary from all unique tokens
  const vocabulary = new Map<string, number>();
  let index = 0;
  for (const token of [...tokens1, ...tokens2]) {
    if (!vocabulary.has(token)) {
      vocabulary.set(token, index++);
    }
  }

  if (vocabulary.size === 0) {
    return 0; // No common words or empty texts after tokenization
  }

  // Calculate TF for each document
  const tf1 = calculateTermFrequency(tokens1);
  const tf2 = calculateTermFrequency(tokens2);

  // Calculate IDF across both documents
  const idf = calculateInverseDocumentFrequency([tokens1, tokens2], vocabulary);

  // Create TF-IDF vectors for each document
  const tfidfVector1 = createTfidfVector(tokens1, tf1, idf, vocabulary);
  const tfidfVector2 = createTfidfVector(tokens2, tf2, idf, vocabulary);

  // Calculate cosine similarity using the TF-IDF vectors
  const dotProd = dotProduct(tfidfVector1, tfidfVector2);
  const mag1 = magnitude(tfidfVector1);
  const mag2 = magnitude(tfidfVector2);

  if (mag1 === 0 || mag2 === 0) {
    return 0; // One or both texts are empty or contain only stopwords after TF-IDF
  }

  const similarity = dotProd / (mag1 * mag2);
  return parseFloat((similarity * 100).toFixed(2)); // Return as percentage, rounded to 2 decimal places
};

interface WeightedMatchResult {
  totalPercentage: number;
  breakdown: {
    experience: number;
    education: number;
    skills: number;
  };
}

interface CvSections {
  experience: string;
  education: string;
  skills: string;
}

/**
 * Calculates a weighted match percentage between a job description and CV sections.
 * @param jobDescription The job description text.
 * @param cvSections An object containing text for different CV sections (experience, education, skills).
 * @returns An object with the total weighted percentage and a breakdown of individual section percentages.
 */
export const calculateWeightedMatchPercentage = (
  jobDescription: string,
  cvSections: CvSections
): WeightedMatchResult => {
  const weights = {
    experience: 0.70,
    education: 0.20,
    skills: 0.10,
  };

  const experienceSimilarity = calculateCosineSimilarity(jobDescription, cvSections.experience);
  const educationSimilarity = calculateCosineSimilarity(jobDescription, cvSections.education);
  const skillsSimilarity = calculateCosineSimilarity(jobDescription, cvSections.skills);

  const totalPercentage =
    (experienceSimilarity * weights.experience) +
    (educationSimilarity * weights.education) +
    (skillsSimilarity * weights.skills);

  return {
    totalPercentage: parseFloat(totalPercentage.toFixed(2)),
    breakdown: {
      experience: parseFloat(experienceSimilarity.toFixed(2)),
      education: parseFloat(educationSimilarity.toFixed(2)),
      skills: parseFloat(skillsSimilarity.toFixed(2)),
    },
  };
};