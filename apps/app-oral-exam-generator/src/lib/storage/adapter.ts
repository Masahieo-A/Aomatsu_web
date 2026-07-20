import type { TableName, TableRowMap } from "@/types";

/**
 * ストレージ抽象インターフェース（要件定義 §6）。
 * Google Sheets 実装（Phase 3）と ローカルJSON 実装が同じ契約を満たす。
 * 利用者は教員1人のため、トランザクションは提供しない。
 */
export interface StorageAdapter {
  list<T extends TableName>(
    table: T,
    filter?: Partial<TableRowMap[T]>
  ): Promise<TableRowMap[T][]>;
  insert<T extends TableName>(table: T, rows: TableRowMap[T][]): Promise<void>;
  update<T extends TableName>(
    table: T,
    idColumn: keyof TableRowMap[T] & string,
    id: string,
    patch: Partial<TableRowMap[T]>
  ): Promise<void>;
}

let instance: StorageAdapter | null = null;

/**
 * STORAGE_DRIVER 環境変数に応じたアダプタを返す（既定: json）。
 * sheets 指定時は GOOGLE_SERVICE_ACCOUNT_KEY_PATH と SPREADSHEET_ID が必要。
 * 設定不備の場合は起動を止めず JSON にフォールバックする（要件定義 §3.1）。
 */
export async function getStorage(): Promise<StorageAdapter> {
  if (instance) return instance;

  const driver = process.env.STORAGE_DRIVER ?? "json";
  if (driver === "sheets") {
    const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (keyPath && spreadsheetId) {
      const { SheetsStorageAdapter } = await import("./sheets");
      instance = new SheetsStorageAdapter(keyPath, spreadsheetId);
      return instance;
    }
    console.warn(
      "[storage] STORAGE_DRIVER=sheets ですが GOOGLE_SERVICE_ACCOUNT_KEY_PATH / SPREADSHEET_ID が未設定のため、JSONドライバで代替します。"
    );
  }
  const { JsonStorageAdapter } = await import("./json");
  instance = new JsonStorageAdapter();
  return instance;
}
