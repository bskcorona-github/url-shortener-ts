// Simple URL Shortener TypeScript Project
import * as crypto from "crypto";
import * as fs from "fs";

interface ShortenedUrl {
  id: string;
  originalUrl: string;
  shortCode: string;
  createdAt: Date;
  clickCount: number;
  lastAccessed?: Date;
}

interface UrlStorage {
  urls: Record<string, ShortenedUrl>;
  counter: number;
}

class UrlShortener {
  private storageFile: string;
  private storage: UrlStorage;
  private baseUrl: string;

  constructor(
    baseUrl: string = "https://short.ly",
    storageFile: string = "urls.json"
  ) {
    this.baseUrl = baseUrl;
    this.storageFile = storageFile;
    this.storage = this.loadStorage();
  }

  /**
   * URLを短縮
   */
  shortenUrl(originalUrl: string, customCode?: string): ShortenedUrl {
    // URL妥当性チェック
    if (!this.isValidUrl(originalUrl)) {
      throw new Error("無効なURLです");
    }

    // 既存URLのチェック
    const existing = Object.values(this.storage.urls).find(
      (url) => url.originalUrl === originalUrl
    );
    if (existing) {
      return existing;
    }

    // 短縮コード生成
    const shortCode = customCode || this.generateShortCode();

    // カスタムコードの重複チェック
    if (this.storage.urls[shortCode]) {
      throw new Error("このコードは既に使用されています");
    }

    const shortenedUrl: ShortenedUrl = {
      id: `url_${++this.storage.counter}`,
      originalUrl,
      shortCode,
      createdAt: new Date(),
      clickCount: 0,
    };

    this.storage.urls[shortCode] = shortenedUrl;
    this.saveStorage();

    return shortenedUrl;
  }

  /**
   * 短縮URLから元URLを取得
   */
  expandUrl(shortCode: string, trackClick: boolean = true): string | null {
    const urlData = this.storage.urls[shortCode];
    if (!urlData) {
      return null;
    }

    if (trackClick) {
      urlData.clickCount++;
      urlData.lastAccessed = new Date();
      this.saveStorage();
    }

    return urlData.originalUrl;
  }

  /**
   * 統計情報を取得
   */
  getStats(shortCode?: string): any {
    if (shortCode) {
      const urlData = this.storage.urls[shortCode];
      return urlData
        ? {
            originalUrl: urlData.originalUrl,
            shortCode: urlData.shortCode,
            clickCount: urlData.clickCount,
            createdAt: urlData.createdAt,
            lastAccessed: urlData.lastAccessed,
          }
        : null;
    }

    const allUrls = Object.values(this.storage.urls);
    return {
      totalUrls: allUrls.length,
      totalClicks: allUrls.reduce((sum, url) => sum + url.clickCount, 0),
      topUrls: allUrls
        .sort((a, b) => b.clickCount - a.clickCount)
        .slice(0, 5)
        .map((url) => ({
          shortCode: url.shortCode,
          originalUrl: url.originalUrl,
          clickCount: url.clickCount,
        })),
    };
  }

  /**
   * すべての短縮URLをリスト表示
   */
  listUrls(): ShortenedUrl[] {
    return Object.values(this.storage.urls);
  }

  /**
   * 短縮URLを削除
   */
  deleteUrl(shortCode: string): boolean {
    if (this.storage.urls[shortCode]) {
      delete this.storage.urls[shortCode];
      this.saveStorage();
      return true;
    }
    return false;
  }

  /**
   * 完全な短縮URLを生成
   */
  getFullShortUrl(shortCode: string): string {
    return `${this.baseUrl}/${shortCode}`;
  }

  private loadStorage(): UrlStorage {
    try {
      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, "utf8");
        const parsed = JSON.parse(data);

        // Dateオブジェクトを復元
        Object.values(parsed.urls).forEach((url: any) => {
          url.createdAt = new Date(url.createdAt);
          if (url.lastAccessed) {
            url.lastAccessed = new Date(url.lastAccessed);
          }
        });

        return parsed;
      }
    } catch (error) {
      console.error("ストレージファイルの読み込みエラー:", error);
    }

    return { urls: {}, counter: 0 };
  }

  private saveStorage(): void {
    try {
      fs.writeFileSync(this.storageFile, JSON.stringify(this.storage, null, 2));
    } catch (error) {
      console.error("ストレージファイルの保存エラー:", error);
    }
  }

  private generateShortCode(): string {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";

    for (let i = 0; i < 6; i++) {
      result += chars.charAt(crypto.randomInt(0, chars.length));
    }

    // 重複チェック
    if (this.storage.urls[result]) {
      return this.generateShortCode();
    }

    return result;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// デモンストレーション
function demonstrateUrlShortener(): void {
  const shortener = new UrlShortener();

  console.log("=== URL短縮ツール デモ ===\n");

  // URL短縮のテスト
  console.log("🔗 URL短縮テスト:");

  const testUrls = [
    "https://www.google.com",
    "https://github.com/microsoft/typescript",
    "https://nodejs.org/en/docs/",
  ];

  testUrls.forEach((url) => {
    try {
      const shortened = shortener.shortenUrl(url);
      console.log(`元URL: ${url}`);
      console.log(`短縮URL: ${shortener.getFullShortUrl(shortened.shortCode)}`);
      console.log(`コード: ${shortened.shortCode}\n`);
    } catch (error) {
      console.log(`エラー: ${error}\n`);
    }
  });

  // カスタムコードのテスト
  console.log("🎯 カスタムコードテスト:");
  try {
    const customShortened = shortener.shortenUrl(
      "https://example.com",
      "example"
    );
    console.log(
      `カスタムURL: ${shortener.getFullShortUrl(customShortened.shortCode)}\n`
    );
  } catch (error) {
    console.log(`カスタムコードエラー: ${error}\n`);
  }

  // URL展開のテスト
  console.log("🔍 URL展開テスト:");
  const firstUrl = shortener.listUrls()[0];
  if (firstUrl) {
    const expanded = shortener.expandUrl(firstUrl.shortCode);
    console.log(`短縮コード: ${firstUrl.shortCode}`);
    console.log(`展開URL: ${expanded}\n`);
  }

  // 統計情報の表示
  console.log("📊 統計情報:");
  const stats = shortener.getStats();
  console.log(`総URL数: ${stats.totalUrls}`);
  console.log(`総クリック数: ${stats.totalClicks}`);

  if (stats.topUrls.length > 0) {
    console.log("人気URL:");
    stats.topUrls.forEach((url: any, index: number) => {
      console.log(
        `  ${index + 1}. ${url.shortCode} (${url.clickCount}クリック)`
      );
    });
  }
}

// コマンドライン引数処理
function handleCommandLineArgs(): void {
  const args = process.argv.slice(2);
  const shortener = new UrlShortener();

  if (args.length === 0) {
    demonstrateUrlShortener();
    return;
  }

  const command = args[0].toLowerCase();

  switch (command) {
    case "shorten":
    case "short":
      if (args.length < 2) {
        console.log("使用法: npm run dev shorten <URL> [カスタムコード]");
        return;
      }
      try {
        const url = args[1];
        const customCode = args[2];
        const shortened = shortener.shortenUrl(url, customCode);
        console.log(
          `短縮URL: ${shortener.getFullShortUrl(shortened.shortCode)}`
        );
        console.log(`コード: ${shortened.shortCode}`);
      } catch (error) {
        console.log(`エラー: ${error}`);
      }
      break;

    case "expand":
      if (args.length < 2) {
        console.log("使用法: npm run dev expand <短縮コード>");
        return;
      }
      const expanded = shortener.expandUrl(args[1], false);
      if (expanded) {
        console.log(`元URL: ${expanded}`);
      } else {
        console.log("短縮コードが見つかりません");
      }
      break;

    case "stats":
      if (args.length >= 2) {
        const stats = shortener.getStats(args[1]);
        if (stats) {
          console.log("統計情報:", JSON.stringify(stats, null, 2));
        } else {
          console.log("短縮コードが見つかりません");
        }
      } else {
        const stats = shortener.getStats();
        console.log("全体統計:", JSON.stringify(stats, null, 2));
      }
      break;

    case "list":
      const urls = shortener.listUrls();
      console.log(`登録済みURL (${urls.length}件):`);
      urls.forEach((url) => {
        console.log(
          `${url.shortCode} -> ${url.originalUrl} (${url.clickCount}クリック)`
        );
      });
      break;

    case "delete":
      if (args.length < 2) {
        console.log("使用法: npm run dev delete <短縮コード>");
        return;
      }
      if (shortener.deleteUrl(args[1])) {
        console.log(`短縮URL ${args[1]} を削除しました`);
      } else {
        console.log("短縮コードが見つかりません");
      }
      break;

    default:
      console.log("使用可能なコマンド: shorten, expand, stats, list, delete");
  }
}

// メイン実行
if (require.main === module) {
  handleCommandLineArgs();
}

export { UrlShortener, type ShortenedUrl };