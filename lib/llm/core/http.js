const LLM_CONNECT_TIMEOUT_MS = 30 * 1000;
const LLM_RESPONSE_TIMEOUT_MS = 600 * 1000;

function createTimeoutError(message) {
  const error = new Error(message);
  error.name = 'TimeoutError';
  return error;
}

/**
 * 为 LLM 请求提供独立的连接和响应超时。
 * 连接超时覆盖请求发出到收到响应头；响应超时覆盖响应体（包括流式响应）的读取。
 */
function llmFetch(input, init = {}) {
  const controller = new AbortController();
  const originalSignal = init.signal;
  let responseTimer;

  const abortFromOriginalSignal = () => controller.abort(originalSignal.reason);

  if (originalSignal) {
    if (originalSignal.aborted) {
      abortFromOriginalSignal();
    } else {
      originalSignal.addEventListener('abort', abortFromOriginalSignal, { once: true });
    }
  }

  const connectTimer = setTimeout(() => {
    controller.abort(createTimeoutError(`LLM connection timed out after ${LLM_CONNECT_TIMEOUT_MS}ms`));
  }, LLM_CONNECT_TIMEOUT_MS);
  connectTimer.unref?.();

  return fetch(input, { ...init, signal: controller.signal })
    .then(response => {
      clearTimeout(connectTimer);
      responseTimer = setTimeout(() => {
        controller.abort(createTimeoutError(`LLM response timed out after ${LLM_RESPONSE_TIMEOUT_MS}ms`));
      }, LLM_RESPONSE_TIMEOUT_MS);
      responseTimer.unref?.();

      if (!response.body) {
        clearTimeout(responseTimer);
        return response;
      }

      const body = response.body.pipeThrough(
        new TransformStream({
          transform(chunk, streamController) {
            streamController.enqueue(chunk);
          },
          flush() {
            clearTimeout(responseTimer);
          }
        })
      );

      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    })
    .catch(error => {
      clearTimeout(connectTimer);
      clearTimeout(responseTimer);
      throw error;
    });
}

module.exports = { LLM_CONNECT_TIMEOUT_MS, LLM_RESPONSE_TIMEOUT_MS, llmFetch };
