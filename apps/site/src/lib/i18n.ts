export type Lang = 'en' | 'zh' | 'ja';

const dictionary = {
  en: {
    'nav.home': 'Home',
    'nav.projects': 'Projects',
    'nav.guestbook': 'Guestbook',
    'nav.uses': 'Uses',
    'nav.dossier': 'Dossier',
    'nav.docs': 'Docs',
    'nav.world': 'World',
    'nav.etf': 'ETF',
    'page.index.title': 'Wyatt Au — Backend Engineer & Systems Architect',
    'page.index.subtitle': 'Building deterministic infrastructure and high-performance systems.',
    'page.offline.title': 'Offline',
    'page.offline.message': 'You are currently offline. Please check your internet connection.',
    'page.offline.retry': 'Retry',
    'ui.skipToContent': 'Skip to content',
    'ui.returnHome': 'Return Home',
    'ui.language': 'Language',
  },
  zh: {
    'nav.home': '首页',
    'nav.projects': '项目',
    'nav.guestbook': '留言簿',
    'nav.uses': '工具',
    'nav.dossier': '档案',
    'nav.docs': '文档',
    'nav.world': '世界',
    'nav.etf': 'ETF',
    'page.index.title': 'Wyatt Au — 后端工程师与系统架构师',
    'page.index.subtitle': '构建确定性基础设施和高性能系统。',
    'page.offline.title': '离线',
    'page.offline.message': '您当前处于离线状态。请检查您的网络连接。',
    'page.offline.retry': '重试',
    'ui.skipToContent': '跳转到内容',
    'ui.returnHome': '返回首页',
    'ui.language': '语言',
  },
  ja: {
    'nav.home': 'ホーム',
    'nav.projects': 'プロジェクト',
    'nav.guestbook': 'ゲストブック',
    'nav.uses': '使用環境',
    'nav.dossier': 'ドシェア',
    'nav.docs': 'ドキュメント',
    'nav.world': 'ワールド',
    'nav.etf': 'ETF',
    'page.index.title': 'Wyatt Au — バックエンドエンジニア＆システムアーキテクト',
    'page.index.subtitle': '決定論的なインフラと高性能システムを構築しています。',
    'page.offline.title': 'オフライン',
    'page.offline.message': '現在オフラインです。インターネット接続を確認してください。',
    'page.offline.retry': '再試行',
    'ui.skipToContent': 'コンテンツへスキップ',
    'ui.returnHome': 'ホームに戻る',
    'ui.language': '言語',
  },
} as const;

export function getLangFromUrl(url: string | URL): Lang {
  const pathname = new URL(url).pathname;
  const match = pathname.match(/^\/(en|zh|ja)(\/|$)/);
  if (match) return match[1] as Lang;
  return 'en';
}

// Legacy compatibility: direct translation function
export function t(key: string, lang: Lang): string {
  const translations = dictionary[lang] || dictionary.en;
  return (
    (translations as Record<string, string>)[key] ??
    dictionary.en[key as keyof typeof dictionary.en] ??
    key
  );
}

export function useTranslations(lang: Lang) {
  return (key: string) => t(key, lang);
}
