import { createZhipu } from 'zhipu-ai-provider';

import BaseClient from './base.js';
import { llmFetch } from '../http';

class ZhiPuClient extends BaseClient {
  constructor(config) {
    super(config);
    this.zhipu = createZhipu({
      baseURL: this.endpoint,
      apiKey: this.apiKey,
      fetch: llmFetch
    });
  }

  _getModel() {
    return this.zhipu(this.model);
  }
}

module.exports = ZhiPuClient;
