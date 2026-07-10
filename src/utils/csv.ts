import Papa from 'papaparse';

export async function loadCsv<T>(path: string): Promise<T[]> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load CSV file: ${path}`);
  }

  const csvText = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse<T>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        resolve(result.data);
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}