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

  if (totalTermsInDoc === 0) { // Handle empty document tokens
    return vector; // Return a zero vector
  }

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
 * Parses the structured portfolio context into individual sections.
 * @param structuredContext The full context string with section delimiters.
 * @returns An object with section names as keys and their content as values.
 */
const parseStructuredContext = (structuredContext: string): Record<string, string> => {
  const sections: Record<string, string> = {};
  const sectionRegex = /\[\[SECTION:([A-Z_]+)\]\]\n([\s\S]*?)(?=\n\[\[SECTION:|$)/g;
  let match;

  while ((match = sectionRegex.exec(structuredContext)) !== null) {
    const sectionName = match[1];
    const sectionContent = match[2].trim();
    sections[sectionName] = sectionContent;
  }
  return sections;
};

/**
 * Calculates the cosine similarity between two text inputs using TF-IDF vectorization,
 * with weighted scoring for different sections of the portfolio context.
 * @param text1 The first text input (e.g., job description).
 * @param structuredContext The second text input (e.g., structured portfolio text).
 * @returns The cosine similarity as a percentage (0-100), rounded to 2 decimal places.
 */
export const calculateCosineSimilarity = (text1: string, structuredContext: string): number => {
  const jobDescriptionTokens = tokenize(text1);
  const sections = parseStructuredContext(structuredContext);

  // Define weights for different sections
  const weights: Record<string, number> = {
    RESUME_WORK: 0.70,      // 70% for work experience
    RESUME_EDUCATION: 0.20, // 20% for education
    RESUME_SKILLS: 0.10,    // 10% for skills
    // Other sections will contribute to a general score
  };

  let totalWeightedSimilarity = 0;
  let totalWeight = 0;

  const allDocumentTokens: string[][] = [jobDescriptionTokens];
  const sectionTokens: Record<string, string[]> = {};

  // Tokenize all sections and add to allDocumentTokens for global IDF calculation
  for (const sectionName in sections) {
    const tokens = tokenize(sections[sectionName]);
    sectionTokens[sectionName] = tokens;
    allDocumentTokens.push(tokens);
  }

  // Build a combined vocabulary from all unique tokens across all documents/sections
  const vocabulary = new Map<string, number>();
  let index = 0;
  for (const tokens of allDocumentTokens) {
    for (const token of tokens) {
      if (!vocabulary.has(token)) {
        vocabulary.set(token, index++);
      }
    }
  }

  if (vocabulary.size === 0) {
    return 0; // No common words or empty texts after tokenization
  }

  // Calculate global IDF across all documents/sections
  const idf = calculateInverseDocumentFrequency(allDocumentTokens, vocabulary);

  // Create TF-IDF vector for the job description
  const jobDescriptionTf = calculateTermFrequency(jobDescriptionTokens);
  const jobDescriptionVector = createTfidfVector(jobDescriptionTokens, jobDescriptionTf, idf, vocabulary);

  // Calculate weighted similarity for key sections
  for (const sectionName in weights) {
    const sectionContent = sections[sectionName] || "";
    const tokens = sectionTokens[sectionName] || [];

    if (tokens.length > 0) {
      const sectionTf = calculateTermFrequency(tokens);
      const sectionVector = createTfidfVector(tokens, sectionTf, idf, vocabulary);

      const dotProd = dotProduct(jobDescriptionVector, sectionVector);
      const mag1 = magnitude(jobDescriptionVector);
      const mag2 = magnitude(sectionVector);

      if (mag1 > 0 && mag2 > 0) {
        const similarity = dotProd / (mag1 * mag2);
        totalWeightedSimilarity += similarity * weights[sectionName];
        totalWeight += weights[sectionName];
      }
    }
  }

  // Calculate general similarity for remaining sections (if any)
  let generalContext = "";
  for (const sectionName in sections) {
    if (!weights[sectionName]) { // If not a weighted section
      generalContext += sections[sectionName] + " ";
    }
  }

  if (generalContext.trim().length > 0) {
    const generalTokens = tokenize(generalContext);
    const generalTf = calculateTermFrequency(generalTokens);
    const generalVector = createTfidfVector(generalTokens, generalTf, idf, vocabulary);

    const dotProd = dotProduct(jobDescriptionVector, generalVector);
    const mag1 = magnitude(jobDescriptionVector);
    const mag2 = magnitude(generalVector);

    if (mag1 > 0 && mag2 > 0) {
      const generalSimilarity = dotProd / (mag1 * mag2);
      // Assign a smaller, default weight to general context
      const generalWeight = 0.10; // Example: 10% for general context
      totalWeightedSimilarity += generalSimilarity * generalWeight;
      totalWeight += generalWeight;
    }
  }

  if (totalWeight === 0) {
    return 0; // No relevant sections or content to compare
  }

  const finalSimilarity = totalWeightedSimilarity / totalWeight;
  return parseFloat((finalSimilarity * 100).toFixed(2)); // Return as percentage, rounded to 2 decimal places
};