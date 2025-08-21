import { Client } from '@elastic/elasticsearch';

const ELASTICSEARCH_URL = import.meta.env.VITE_ELASTICSEARCH_URL || 'http://localhost:9200';
const ELASTICSEARCH_API_KEY = import.meta.env.VITE_ELASTICSEARCH_API_KEY;

let client: Client;

try {
  client = new Client({
    node: ELASTICSEARCH_URL,
    auth: {
      apiKey: ELASTICSEARCH_API_KEY
    }
  });

  // Test the connection
  await client.ping();
  console.log('Elasticsearch connection successful');
} catch (error) {
  console.error('Failed to connect to Elasticsearch:', error);
  // Fallback to a mock client if connection fails
  client = {
    index: () => Promise.reject(new Error('Elasticsearch not available')),
    search: () => Promise.reject(new Error('Elasticsearch not available')),
    indices: {
      exists: () => Promise.resolve(false),
      create: () => Promise.reject(new Error('Elasticsearch not available'))
    }
  } as unknown as Client;
}

export default client;