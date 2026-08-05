// lib/utils/logger.js

function formatError(error) {
  const parts = [];
  const name = error && error.name ? error.name : 'Error';
  const message = error && error.message ? error.message : String(error);

  parts.push(`${name}: ${message}`);

  if (error && error.stack) {
    parts.push(error.stack);
  }

  if (error && error.cause) {
    parts.push(`Cause: ${formatLogArg(error.cause)}`);
  }

  return parts.join('\n');
}

function formatLogArg(arg) {
  if (arg instanceof Error) {
    return formatError(arg);
  }

  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg, null, 2);
    } catch (error) {
      return `[Unserializable Object: ${error.message}]`;
    }
  }

  return String(arg);
}

function formatLogMessage(args) {
  return args.map(formatLogArg).join(' ');
}

function log(level, ...args) {
  // 统一走 console：在 Electron 打包应用中 Next.js 服务端运行于主进程内，
  // electron/modules/server.js 仅重写了 console.log / console.error 并写入 nextjs-*.log，
  // console.info / warn / debug 未被重写（打包后无终端会丢失），因此这里做映射：
  //   error  -> console.error  -> 写入 [ERROR]
  //   其它   -> console.log    -> 写入 [LOG]
  // 同时不再使用 ipcRenderer：主进程内不存在 ipcRenderer，且 webpack 打包后
  // require('electron') 会解析到 npm 包并抛 "Electron failed to install correctly"。
  try {
    if (level === 'error') {
      console.error(...args);
    } else {
      console.log(...args);
    }
  } catch (error) {
    console.error('Failed to log:', error);
  }
}

export { formatError, formatLogArg, formatLogMessage };

const logger = {
  info: (...args) => log('info', ...args),
  error: (...args) => log('error', ...args),
  warn: (...args) => log('warn', ...args),
  debug: (...args) => log('debug', ...args)
};
export default logger;
