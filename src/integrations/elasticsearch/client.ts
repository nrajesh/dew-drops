import { Client } from '@elastic/elasticsearch';

const ELASTICSEARCH_URL = import.meta.env.VITE_ELASTICSEARCH_URL || 'http://localhost:9200';
const ELASTICSEARCH_API_KEY = import.meta.env.VITE_ELASTICSEARCH_API_KEY;

const client = new Client({
  node: ELASTICSEARCH_URL,
  auth: {
    apiKey: ELASTICSEARCH_API_KEY
  }
});

export default client;