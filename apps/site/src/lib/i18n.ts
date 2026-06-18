export type Lang = 'en' | 'zh' | 'ja';

export type TranslationDictionary = Record<string, Record<Lang, string>>;

const translations: TranslationDictionary = {
  'nav.home': {
    en: 'Home',
    zh: '首页',
    ja: 'ホーム',
  },
  'nav.projects': {
    en: 'Projects',
    zh: '项目',
    ja: 'プロジェクト',
  },
  'nav.guestbook': {
    en: 'Guestbook',
    zh: '留言簿',
    ja: 'ゲストブック',
  },
  'nav.uses': {
    en: 'Uses',
    zh: '工具',
    ja: '使用環境',
  },
  'nav.dossier': {
    en: 'Dossier',
    zh: '档案',
    ja: 'ドシェア',
  },
  'nav.docs': {
    en: 'Docs',
    zh: '文档',
    ja: 'ドキュメント',
  },
  'nav.world': {
    en: 'World',
    zh: '世界',
    ja: 'ワールド',
  },
  'nav.etf': {
    en: 'ETF',
    zh: 'ETF',
    ja: 'ETF',
  },
  'page.index.title': {
    en: 'Wyatt Au — Backend Engineer & Systems Architect',
    zh: 'Wyatt Au — 后端工程师与系统架构师',
    ja: 'Wyatt Au — バックエンドエンジニア＆システムアーキテクト',
  },
  'page.index.subtitle': {
    en: 'Building deterministic infrastructure and high-performance systems.',
    zh: '构建确定性基础设施和高性能系统。',
    ja: '決定論的なインフラと高性能システムを構築しています。',
  },
  'page.offline.title': {
    en: 'Offline',
    zh: '离线',
    ja: 'オフライン',
  },
  'page.offline.message': {
    en: 'You are currently offline. Please check your internet connection.',
    zh: '您当前处于离线状态。请检查您的网络连接。',
    ja: '現在オフラインです。インターネット接続を確認してください。',
  },
  'page.offline.retry': {
    en: 'Retry',
    zh: '重试',
    ja: '再試行',
  },
  'ui.skipToContent': {
    en: 'Skip to content',
    zh: '跳转到内容',
    ja: 'コンテンツへスキップ',
  },
  'ui.returnHome': {
    en: 'Return Home',
    zh: '返回首页',
    ja: 'ホームに戻る',
  },
  'ui.language': {
    en: 'Language',
    zh: '语言',
    ja: '言語',
  },
};

export function t(key: string, lang: Lang): string {
  return translations[key]?.[lang] ?? translations[key]?.en ?? key;
}

export function getLangFromUrl(url: string | URL): Lang {
  const pathname = new URL(url).pathname;
  const match = pathname.match(/^\/(en|zh|ja)(\/|$)/);
  if (match) return match[1] as Lang;
  return 'en';
}

export function useTranslations(lang: Lang) {
  return (key: string) => t(key, lang);
}
