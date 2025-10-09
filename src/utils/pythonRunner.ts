import loadPyodide from 'pyodide';

let pyodide: any = null;

export const initializePython = async () => {
  if (pyodide) return pyodide;

  try {
    // Load Pyodide
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/",
    });

    // Load required packages
    await pyodide.loadPackage("scikit-learn");

    return pyodide;
  } catch (error) {
    console.error("Failed to initialize Python environment:", error);
    throw new Error("Failed to initialize Python environment. Please check your internet connection and try again.");
  }
};

export const calculateMatchPercentage = async (text1: string, text2: string): Promise<number> => {
  if (!pyodide) {
    try {
      pyodide = await initializePython();
    } catch (error) {
      console.error("Python initialization failed:", error);
      throw error; // Re-throw the error to be handled by the caller
    }
  }

  try {
    // Define the Python function
    const pythonCode = `
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def calculate_match_percentage(text1, text2):
    vectorizer = CountVectorizer().fit_transform([text1, text2])
    vectors = vectorizer.toarray()
    cosine_sim = cosine_similarity(vectors)
    match_percentage = cosine_sim[0, 1] * 100
    return match_percentage
`;

    // Run the Python code
    pyodide.runPython(pythonCode);

    // Call the function with the provided texts
    const matchPercentage = pyodide.globals.get('calculate_match_percentage')(text1, text2);

    return matchPercentage;
  } catch (error) {
    console.error("Error calculating match percentage:", error);
    throw new Error("Failed to calculate match percentage. Please try again later.");
  }
};