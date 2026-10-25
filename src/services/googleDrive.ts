/**
 * Google Drive REST API Integration Service
 * Manages in-memory OAuth tokens, file operations (list, upload, download, delete),
 * and automated study session backups to Google Drive.
 */

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';

// In-Memory Token Cache (Never stored in LocalStorage/SessionStorage per security mandate)
let cachedDriveAccessToken: string | null = null;

export interface DriveDiagnosticLog {
  timestamp: string;
  type: 'auth' | 'lookup' | 'upload' | 'restore' | 'error';
  message: string;
}

const diagnosticLogs: DriveDiagnosticLog[] = [];

export function addDriveDiagnosticLog(type: 'auth' | 'lookup' | 'upload' | 'restore' | 'error', message: string) {
  const log: DriveDiagnosticLog = {
    timestamp: new Date().toLocaleTimeString(),
    type,
    message,
  };
  diagnosticLogs.unshift(log);
  if (diagnosticLogs.length > 50) diagnosticLogs.pop();
  console.log(`[Google Drive ${type.toUpperCase()}] ${message}`);
}

export function getDriveDiagnosticLogs(): DriveDiagnosticLog[] {
  return [...diagnosticLogs];
}

export function setCachedDriveToken(token: string | null) {
  cachedDriveAccessToken = token;
  if (token) {
    addDriveDiagnosticLog('auth', 'OAuth access token cached in memory (valid session)');
  } else {
    addDriveDiagnosticLog('auth', 'OAuth access token cleared from memory (disconnected/logged out)');
  }
}

export function getCachedDriveToken(): string | null {
  return cachedDriveAccessToken;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

/**
 * Authenticate or re-authenticate with Google Drive OAuth scopes
 */
export async function authenticateGoogleDrive(): Promise<string> {
  if (cachedDriveAccessToken) {
    addDriveDiagnosticLog('auth', 'Reusing existing in-memory OAuth access token');
    return cachedDriveAccessToken;
  }

  addDriveDiagnosticLog('auth', 'Initiating Google OAuth sign-in popup for Drive scopes...');
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive');
    provider.addScope('https://www.googleapis.com/auth/drive.file');

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      addDriveDiagnosticLog('error', 'Firebase Auth completed but OAuth access token was missing');
      throw new Error('Failed to obtain Google Drive access token.');
    }

    cachedDriveAccessToken = credential.accessToken;
    addDriveDiagnosticLog('auth', `Successfully authenticated as ${result.user.email || result.user.uid}`);
    return cachedDriveAccessToken;
  } catch (err: any) {
    const msg = err.code || err.message || 'OAuth popup failed';
    addDriveDiagnosticLog('error', `OAuth Authentication Failed: ${msg}`);
    throw err;
  }
}

/**
 * Ensure valid access token before API call
 */
async function getValidToken(interactive = true): Promise<string> {
  const token = getCachedDriveToken();
  if (token) return token;
  if (!interactive) {
    throw new Error('Google Drive access token missing or expired. Interactive login required.');
  }
  return await authenticateGoogleDrive();
}

/**
 * List files in Google Drive (filtered for app backups or general study docs)
 */
export async function listDriveFiles(query?: string, interactive = true): Promise<DriveFileItem[]> {
  addDriveDiagnosticLog('lookup', 'Listing files from Google Drive...');
  const token = await getValidToken(interactive);
  const defaultQuery = "trashed = false and (name contains 'Chronos' or name contains 'Study' or mimeType = 'application/json')";
  const q = encodeURIComponent(query || defaultQuery);

  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,iconLink)&pageSize=50&orderBy=modifiedTime%20desc`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401 && interactive) {
      addDriveDiagnosticLog('auth', 'Token expired (401). Attempting re-authentication...');
      setCachedDriveToken(null);
      const newToken = await authenticateGoogleDrive();
      const retryResponse = await fetch(url, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      if (!retryResponse.ok) {
        addDriveDiagnosticLog('error', `List files retry failed with status ${retryResponse.status}`);
        throw new Error(`Google Drive API Error (${retryResponse.status})`);
      }
      const data = await retryResponse.json();
      addDriveDiagnosticLog('lookup', `Retrieved ${data.files?.length || 0} file(s) from Drive`);
      return data.files || [];
    }
    const errText = await response.text();
    addDriveDiagnosticLog('error', `List files error (${response.status}): ${errText}`);
    throw new Error(`Failed to list Google Drive files (${response.status}): ${errText}`);
  }

  const data = await response.json();
  addDriveDiagnosticLog('lookup', `Successfully retrieved ${data.files?.length || 0} file(s) from Drive`);
  return data.files || [];
}

/**
 * Upload JSON study backup to Google Drive
 */
export async function uploadJsonToDrive(
  fileName: string,
  jsonData: object | string,
  interactive = true
): Promise<DriveFileItem> {
  addDriveDiagnosticLog('upload', `Creating new file "${fileName}" on Google Drive (POST multipart)...`);
  const token = await getValidToken(interactive);
  const jsonContent = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: 'Chronos Study Time Tracker Backup File',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([jsonContent], { type: 'application/json' }));

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errText = await response.text();
    addDriveDiagnosticLog('error', `Upload file failed (${response.status}): ${errText}`);
    throw new Error(`Google Drive Upload Failed (${response.status}): ${errText}`);
  }

  const fileItem = await response.json();
  addDriveDiagnosticLog('upload', `Created file "${fileItem.name}" on Drive (File ID: ${fileItem.id})`);
  return fileItem;
}

/**
 * Upload PDF study report directly to Google Drive
 */
export async function uploadPdfToDrive(
  fileName: string,
  pdfBlob: Blob,
  interactive = true
): Promise<DriveFileItem> {
  addDriveDiagnosticLog('upload', `Uploading PDF report "${fileName}" to Google Drive...`);
  const token = await getValidToken(interactive);

  const metadata = {
    name: fileName,
    mimeType: 'application/pdf',
    description: 'Certified Study Performance Report exported from Chronos',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', pdfBlob);

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errText = await response.text();
    addDriveDiagnosticLog('error', `Upload PDF report failed (${response.status}): ${errText}`);
    throw new Error(`Google Drive PDF Upload Failed (${response.status}): ${errText}`);
  }

  const fileItem = await response.json();
  addDriveDiagnosticLog('upload', `Uploaded PDF report "${fileItem.name}" to Drive (File ID: ${fileItem.id})`);
  return fileItem;
}

/**
 * Read text/JSON file contents from Google Drive
 */
export async function getDriveFileContent(fileId: string, interactive = true): Promise<string> {
  addDriveDiagnosticLog('restore', `Downloading file content for File ID: ${fileId}...`);
  const token = await getValidToken(interactive);
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    addDriveDiagnosticLog('error', `Download file content failed (${response.status})`);
    throw new Error(`Failed to download file content from Google Drive (${response.status})`);
  }

  const text = await response.text();
  addDriveDiagnosticLog('restore', `Successfully downloaded file content (${text.length} bytes)`);
  return text;
}

/**
 * Delete a file from Google Drive (Mandatory user confirmation should be handled in UI before calling this)
 */
export async function deleteDriveFile(fileId: string, interactive = true): Promise<boolean> {
  addDriveDiagnosticLog('upload', `Deleting file ${fileId} from Google Drive...`);
  const token = await getValidToken(interactive);
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    addDriveDiagnosticLog('error', `Delete file failed (${response.status})`);
    throw new Error(`Failed to delete file from Google Drive (${response.status})`);
  }

  addDriveDiagnosticLog('upload', `Successfully deleted file ${fileId} from Google Drive`);
  return true;
}

/**
 * Get Google Drive storage quota info
 */
export async function getDriveStorageAbout(interactive = true): Promise<{ limit?: string; usage?: string; userEmail?: string }> {
  try {
    const token = await getValidToken(interactive);
    const url = 'https://www.googleapis.com/drive/v3/about?fields=storageQuota,user';

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return {};
    const data = await response.json();
    return {
      limit: data.storageQuota?.limit,
      usage: data.storageQuota?.usage,
      userEmail: data.user?.emailAddress,
    };
  } catch {
    return {};
  }
}

export const DEDICATED_BACKUP_FILENAME = 'StudyTrackerBackup.json';

/**
 * Find existing dedicated backup file on Google Drive
 */
export async function findDedicatedBackupFile(interactive = false): Promise<DriveFileItem | null> {
  try {
    addDriveDiagnosticLog('lookup', `Searching for dedicated backup file "${DEDICATED_BACKUP_FILENAME}"...`);
    const token = await getValidToken(interactive);
    const q = encodeURIComponent(`trashed = false and name = '${DEDICATED_BACKUP_FILENAME}'`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink)&pageSize=1`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      if (response.status === 401 && interactive) {
        addDriveDiagnosticLog('auth', 'Token 401 expired during backup lookup. Retrying with auth...');
        setCachedDriveToken(null);
        const newToken = await authenticateGoogleDrive();
        const retryResponse = await fetch(url, {
          headers: { Authorization: `Bearer ${newToken}` },
        });
        if (!retryResponse.ok) return null;
        const data = await retryResponse.json();
        const found = data.files?.[0] || null;
        if (found) addDriveDiagnosticLog('lookup', `Found dedicated backup file (File ID: ${found.id})`);
        else addDriveDiagnosticLog('lookup', `No dedicated backup file "${DEDICATED_BACKUP_FILENAME}" found on Drive yet`);
        return found;
      }
      return null;
    }

    const data = await response.json();
    const found = data.files?.[0] || null;
    if (found) addDriveDiagnosticLog('lookup', `Found dedicated backup file (File ID: ${found.id})`);
    else addDriveDiagnosticLog('lookup', `No dedicated backup file "${DEDICATED_BACKUP_FILENAME}" found on Drive yet`);
    return found;
  } catch (err: any) {
    addDriveDiagnosticLog('lookup', `Dedicated backup lookup notice: ${err.message || 'Token unauthenticated'}`);
    return null;
  }
}

/**
 * Update existing JSON file content in Google Drive without creating a new file
 */
export async function updateJsonInDrive(
  fileId: string,
  jsonData: object | string,
  interactive = false
): Promise<DriveFileItem> {
  addDriveDiagnosticLog('upload', `PATCH updating existing file ${fileId} on Google Drive...`);
  const token = await getValidToken(interactive);
  const jsonContent = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);

  const metadata = {
    mimeType: 'application/json',
    description: 'Chronos Dedicated Study Time Tracker Backup File',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([jsonContent], { type: 'application/json' }));

  const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!response.ok) {
    if (response.status === 404) {
      addDriveDiagnosticLog('upload', `File ID ${fileId} returned 404. Re-creating dedicated file on Drive...`);
      return await uploadJsonToDrive(DEDICATED_BACKUP_FILENAME, jsonData, interactive);
    }
    const errText = await response.text();
    addDriveDiagnosticLog('error', `PATCH update file failed (${response.status}): ${errText}`);
    throw new Error(`Google Drive Update Failed (${response.status}): ${errText}`);
  }

  const updatedItem = await response.json();
  addDriveDiagnosticLog('upload', `Successfully updated "${updatedItem.name}" in-place (File ID: ${updatedItem.id})`);
  return updatedItem;
}

/**
 * Save or Update dedicated backup file (guarantees single file on Drive)
 */
export async function saveOrUpdateDedicatedBackup(jsonData: object, interactive = false): Promise<DriveFileItem> {
  const existingFile = await findDedicatedBackupFile(interactive);
  if (existingFile) {
    return await updateJsonInDrive(existingFile.id, jsonData, interactive);
  } else {
    return await uploadJsonToDrive(DEDICATED_BACKUP_FILENAME, jsonData, interactive);
  }
}

/**
 * Disconnect Google Drive session
 */
export function disconnectGoogleDrive() {
  setCachedDriveToken(null);
  addDriveDiagnosticLog('auth', 'Google Drive disconnected by user');
}
