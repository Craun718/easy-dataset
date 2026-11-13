import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import BaseClient from './base.js';
import { llmFetch } from '../http';

class OpenRouterClient extends BaseClient {
  constructor(config) {
    super(config);
    this.openrouter = createOpenRouter({
      baseURL: this.endpoint,
      apiKey: this.apiKey,
      fetch: llmFetch
    });
  }

  _getModel() {
    return this.openrouter(this.model);
  }
}

module.exports = OpenRouterClient;
