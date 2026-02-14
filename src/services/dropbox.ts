import { Dropbox, DropboxAuth, DropboxResponseError } from 'dropbox';
import { db } from './db';
import type { SeihinData } from '../types';

const CLIENT_ID = import.meta.env.VITE_DROPBOX_APP_KEY as string | undefined;
const DATA_FILE_PATH = '/data.json';

// リダイレクトURIを動的に決定
function getRedirectUri(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

// DropboxAuthインスタンスを作成
function createAuth(): DropboxAuth {
  if (!CLIENT_ID) {
    throw new Error('VITE_DROPBOX_APP_KEY が設定されていません');
  }
  return new DropboxAuth({ clientId: CLIENT_ID });
}

// 保存済みトークン情報でDropboxインスタンスを作成
async function createDropboxClient(): Promise<Dropbox | null> {
  if (!CLIENT_ID) return null;

  const accessTokenMeta = await db.metadata.get('dropboxAccessToken');
  const refreshTokenMeta = await db.metadata.get('dropboxRefreshToken');

  if (!refreshTokenMeta?.value) return null;

  const auth = createAuth();
  if (accessTokenMeta?.value) {
    auth.setAccessToken(accessTokenMeta.value);
  }
  auth.setRefreshToken(refreshTokenMeta.value);

  const expiresAtMeta = await db.metadata.get('dropboxAccessTokenExpiresAt');
  if (expiresAtMeta?.value) {
    auth.setAccessTokenExpiresAt(new Date(expiresAtMeta.value));
  }

  return new Dropbox({ auth });
}

// OAuth認証URLを取得
export async function getAuthUrl(): Promise<string> {
  const auth = createAuth();

  const authUrl = await auth.getAuthenticationUrl(
    getRedirectUri(),
    undefined,
    'code',
    'offline',
    undefined,
    undefined,
    true, // PKCE有効
  );

  // codeVerifierを保存（コールバック時に必要）
  const codeVerifier = auth.getCodeVerifier();
  await db.metadata.put({ key: 'dropboxCodeVerifier', value: codeVerifier });

  return authUrl as unknown as string;
}

// OAuthコールバック処理
export async function handleAuthCallback(code: string): Promise<void> {
  const auth = createAuth();

  // 保存済みcodeVerifierを復元
  const codeVerifierMeta = await db.metadata.get('dropboxCodeVerifier');
  if (codeVerifierMeta?.value) {
    auth.setCodeVerifier(codeVerifierMeta.value);
  }

  const response = await auth.getAccessTokenFromCode(getRedirectUri(), code);
  const result = response.result as Record<string, unknown>;

  const accessToken = result.access_token as string;
  const refreshToken = result.refresh_token as string;
  const expiresIn = result.expires_in as number;

  // トークンを保存
  await db.metadata.bulkPut([
    { key: 'dropboxAccessToken', value: accessToken },
    { key: 'dropboxRefreshToken', value: refreshToken },
    {
      key: 'dropboxAccessTokenExpiresAt',
      value: new Date(Date.now() + expiresIn * 1000).toISOString(),
    },
  ]);

  // codeVerifierは不要になったので削除
  await db.metadata.delete('dropboxCodeVerifier');
}

// Dropbox連携状態を確認
export async function isConnected(): Promise<boolean> {
  const refreshToken = await db.metadata.get('dropboxRefreshToken');
  return !!refreshToken?.value;
}

// Dropbox連携を解除
export async function disconnect(): Promise<void> {
  await db.metadata.bulkDelete([
    'dropboxAccessToken',
    'dropboxRefreshToken',
    'dropboxAccessTokenExpiresAt',
    'dropboxCodeVerifier',
  ]);
}

// ファイルをダウンロード
export async function downloadFile(): Promise<{
  data: SeihinData;
  rev: string;
} | null> {
  const dbx = await createDropboxClient();
  if (!dbx) return null;

  try {
    const response = await dbx.filesDownload({ path: DATA_FILE_PATH });
    const metadata = response.result as typeof response.result & { fileBlob?: Blob };
    const rev = metadata.rev;

    // ブラウザ環境ではfileBlobからテキストを読み取る
    const blob = metadata.fileBlob;
    if (!blob) throw new Error('ファイルデータが取得できません');

    const text = await blob.text();
    const data = JSON.parse(text) as SeihinData;

    return { data, rev };
  } catch (error) {
    if (error instanceof DropboxResponseError && error.status === 409) {
      // ファイルが存在しない場合
      return null;
    }
    throw error;
  }
}

// ファイルをアップロード
export async function uploadFile(
  data: SeihinData,
  rev?: string,
): Promise<string> {
  const dbx = await createDropboxClient();
  if (!dbx) throw new Error('Dropboxに接続されていません');

  const content = JSON.stringify(data);
  const blob = new Blob([content], { type: 'application/json' });

  const mode: { '.tag': 'update'; update: string } | { '.tag': 'add' } = rev
    ? { '.tag': 'update' as const, update: rev }
    : { '.tag': 'add' as const };

  const response = await dbx.filesUpload({
    path: DATA_FILE_PATH,
    mode,
    contents: blob,
  });

  return response.result.rev;
}

// 最終同期日時を取得
export async function getLastSyncTime(): Promise<string | null> {
  const meta = await db.metadata.get('lastSync');
  return meta?.value ?? null;
}
