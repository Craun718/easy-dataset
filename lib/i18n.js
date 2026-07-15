import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入翻译文件
import enTranslation from '../locales/en/translation.json';
import zhCNTranslation from '../locales/zh-CN/translation.json';
import trTranslation from '../locales/tr/translation.json';
import ptBRTranslation from '../locales/pt-BR/translation.json';
import itTranslation from '../locales/it/translation.json';

const resources = {
  en: { translation: enTranslation },
  zh: { translation: zhCNTranslation },
  'zh-CN': { translation: zhCNTranslation },
  tr: { translation: trTranslation },
  'pt-BR': { translation: ptBRTranslation },
  it: { translation: itTranslation }
};

const isServer = typeof window === 'undefined';
const i18nInstance = i18n.createInstance();

// 服务端：同步初始化（资源已内联，无需异步加载）
// 客户端：同样同步初始化，后续再挂载语言检测
i18nInstance.use(initReactI18next).init({
  resources,
  supportedLngs: ['en', 'zh', 'zh-CN', 'tr', 'pt-BR', 'it'],
  fallbackLng: 'en',
  debug: process.env.NODE_ENV === 'development',
  interpolation: { escapeValue: false },
  detection: {
    order: ['localStorage', 'navigator'],
    lookupLocalStorage: 'i18nextLng',
    caches: ['localStorage'],
    convertDetectedLanguage: lng => {
      if (!lng) return lng;
      const normalized = String(lng).toLowerCase();
      if (normalized === 'zh' || normalized.startsWith('zh-')) return 'zh-CN';
      return lng;
    }
  }
});

// 仅客户端挂载语言检测（需要 navigator / localStorage）
if (!isServer) {
  i18nInstance.use(LanguageDetector);
}

export default i18nInstance;
