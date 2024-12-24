import { newDate } from "app/lib/utils";

export class Foaled {
  value: string | Date; // 元の値を保持
  year: string;
  private parsedDate: Date | null; // 有効な Date の場合は保持、無効な場合は null

  constructor(value: string | Date) {
    this.value = value;
    this.parsedDate = Foaled.parseDate(value);
    this.year = Foaled.parseYear(value);
  }

  // value を Date に変換（年のみの場合は "YYYY-01-01" を補完）
  private static parseDate(value: string | Date): Date | null {
    if (value instanceof Date) {
      return value;
    }

    // 「年のみ」の文字列を検出して補完
    const yearOnlyMatch = value.match(/^\d{4}$/); // 年のみ (例: "1950")
    if (yearOnlyMatch) {
      return new Date(`${yearOnlyMatch[0]}-01-01`);
    }

    // 通常の日付文字列としてパース
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private static parseYear(value: string | Date): string {
    if (value instanceof Date) {
      // Date型の場合は年を返す
      return value.getFullYear().toString()
    } else {
      // それ以外の場合はそのまま返す
      return value
    }
  }

  // 比較メソッド（静的）
  static compare(a: Foaled, b: Foaled): number {
    if (a.parsedDate === null && b.parsedDate === null) {
      return 0; // 両方無効なら順序を維持
    }
    if (a.parsedDate === null) return -1; // 無効は前へ
    if (b.parsedDate === null) return 1;
    return a.parsedDate > b.parsedDate ? 1 : a.parsedDate < b.parsedDate ? -1 : 0;
  }
}