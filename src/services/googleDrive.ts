/**
 * Google Drive REST API Integration Service
 * Manages in-memory OAuth tokens, file operations (list, upload, download, delete),
 * and automated study session backups to Google Drive with exhaustive runtime diagnostics.
 */

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';

// In-Memory Token Cache (Never stored in LocalStorage/SessionStorage per security mandate)
let cachedDriveAccessToken: string | null = null;

/**
 * Diagnostic helper: Probe window.gapi and window.google.accounts for client library state
 */
export function checkAndLogGapiAuth2Status() {
  console.group('[Google Drive Client & gapi.auth2 Lifecycle Diagnostic Probe]');
  const timeStr = new Date().toLocaleTimeString();
  
  if (typeof window === 'undefined') {
    console.log('[gapi Probe] Executing in non-window/SSR context.');
    console.groupEnd();
    return;
  }

  const gapiObj = (window as any).gapi;
  const hasGapi = typeof gapiObj !== 'undefined';
  const hasGapiAuth2 = hasGapi && typeof gapiObj.auth2 !== 'undefined';
  const hasGis = typeof (window as any).google?.accounts?.oauth2 !== 'undefined';

  console.log(`[GAPI Lifecycle Probe] [${timeStr}] window.gapi loaded:`, hasGapi);
  console.log(`[GAPI Lifecycle Probe] [${timeStr}] window.gapi.client loaded:`, hasGapi && typeof gapiObj.client !== 'undefined');
  console.log(`[GAPI Lifecycle Probe] [${timeStr}] window.gapi.auth2 loaded:`, hasGapiAuth2);
  console.log(`[GAPI Lifecycle Probe] [${timeStr}] window.google.accounts.oauth2 (GIS) loaded:`, hasGis);

  if (hasGapiAuth2) {
    try {
      console.log('[gapi.auth2 Evaluation] Calling gapi.auth2.getAuthInstance()...');
      const auth2Instance = gapiObj.auth2.getAuthInstance();
      if (auth2Instance) {
        const isSignedIn = auth2Instance.isSignedIn?.get();
        const currentUser = auth2Instance.currentUser?.get();
        const authResponse = currentUser?.getAuthResponse();
        console.log('[gapi.auth2 Instance State] getAuthInstance() returned valid instance!');
        console.log('[gapi.auth2 Instance State] User is currently signed in:', Boolean(isSignedIn));
        console.log('[gapi.auth2 Instance State] Basic Profile Email:', currentUser?.getBasicProfile?.()?.getEmail?.() || 'N/A');
        console.log('[gapi.auth2 Instance State] Access Token Present:', Boolean(authResponse?.access_token));
        addDriveDiagnosticLog('auth', `gapi.auth2.getAuthInstance() active (Signed In: ${Boolean(isSignedIn)})`);
      } else {
        console.warn('[gapi.auth2 Instance State] gapi.auth2 is present, but getAuthInstance() returned null (gapi.auth2.init has not completed yet).');
        addDriveDiagnosticLog('auth', 'gapi.auth2 loaded but getAuthInstance() returned null (awaiting init)');
      }
    } catch (err: any) {
      console.warn('[gapi.auth2 Exception] Failed inspecting gapi.auth2.getAuthInstance():', err.message || err);
    }
  } else if (hasGapi) {
    console.log('[GAPI Lifecycle Probe] window.gapi exists, probing gapi.load("client:auth2") state...');
    try {
      if (typeof gapiObj.load === 'function') {
        console.log('[GAPI Lifecycle Probe] gapi.load function detected. GAPI is ready for client:auth2 module loading.');
      }
    } catch (e) {
      console.warn('[GAPI Lifecycle Probe] Error probing gapi.load:', e);
    }
  } else {
    console.log('[GAPI Lifecycle Probe] window.gapi is not injected into DOM yet. GAPI scripts loading asynchronously.');
  }

  console.log(`[Google Drive Service State] In-memory cachedDriveAccessToken present:`, Boolean(cachedDriveAccessToken));
  console.groupEnd();
}

// Automatically execute probe on module load & window event triggers
if (typeof window !== 'undefined') {
  setTimeout(() => checkAndLogGapiAuth2Status(), 1000);
}

export interface DriveDiagnosticLog {
  timestamp: string;
  type: 'auth' | 'lookup' | 'upload' | 'restore' | 'error';
  message: string;
}

const diagnosticLogs: DriveDiagnosticLog[] = [];

export function addDriveDiagnosticLog(type: 'auth' | 'lookup' | 'upload' | 'restore' | 'error', message: string) {
  const timeStr = new Date().toLocaleTimeString();
  const log: DriveDiagnosticLog = {
    timestamp: timeStr,
    type,
    message,
  };
  diagnosticLogs.unshift(log);
  if (diagnosticLogs.length > 100) diagnosticLogs.pop();
  console.log(`%c[Google Drive ${type.toUpperCase()}] [${timeStr}] ${message}`, 'color: #38bdf8; font-weight: bold;');
}

export function getDriveDiagnosticLogs(): DriveDiagnosticLog[] {
  return [...diagnosticLogs];
}

export function setCachedDriveToken(token: string | null) {
  cachedDriveAccessToken = token;
  if (token) {
    const tokenPreview = `${token.substring(0, 6)}...${token.substring(token.length - 4)}`;
    console.log(`[Google Drive Token Cache] Valid access token stored in memory (${tokenPreview}).`);
    addDriveDiagnosticLog('auth', `OAuth access token cached in memory (Key preview: ${tokenPreview})`);
  } else {
    console.log('[Google Drive Token Cache] In-memory access token cleared.');
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
  console.group('[OAuth Popup State Machine & Callback Lifecycle]');
  console.log('[OAuth Transition] STATE: IDLE -> INITIATING_OAUTH_FLOW');
  
  if (cachedDriveAccessToken) {
    const tokenPreview = `${cachedDriveAccessToken.substring(0, 6)}...`;
    console.log('[OAuth Transition] Existing valid token found in memory cache:', tokenPreview);
    addDriveDiagnosticLog('auth', 'Reusing existing in-memory OAuth access token');
    console.groupEnd();
    return cachedDriveAccessToken;
  }

  // Pre-flight probe
  checkAndLogGapiAuth2Status();

  console.log('[OAuth Transition] STEP 1: Constructing GoogleAuthProvider instance...');
  addDriveDiagnosticLog('auth', 'Initiating Google OAuth sign-in popup for Drive scopes...');
  
  try {
    const provider = new GoogleAuthProvider();
    console.log('[OAuth Transition] STEP 2: Adding required scopes: https://www.googleapis.com/auth/drive, https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/drive');
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.setCustomParameters({
      prompt: 'consent select_account',
      access_type: 'offline',
    });

    console.log('[OAuth Transition] STATE: INITIATING_OAUTH_FLOW -> AWAITING_POPUP_CALLBACK');
    console.log('[OAuth Transition] STEP 3: Invoking Firebase signInWithPopup(auth, provider)... Opening OAuth window.');
    
    const startTime = Date.now();
    const result = await signInWithPopup(auth, provider);
    const durationMs = Date.now() - startTime;
    
    console.log(`[OAuth Transition] STATE: AWAITING_POPUP_CALLBACK -> POPUP_RESOLVED (Completed in ${durationMs}ms)`);
    const userIdentifier = result.user.email || result.user.uid;
    console.log('[OAuth Transition] STEP 4: OAuth popup callback returned user credential payload for user:', userIdentifier);

    console.log('[OAuth Transition] STEP 5: Parsing OAuth credential result from GoogleAuthProvider...');
    const credential = GoogleAuthProvider.credentialFromResult(result);
    let token = credential?.accessToken;

    if (!token && (result as any)._tokenResponse?.oauthAccessToken) {
      token = (result as any)._tokenResponse.oauthAccessToken;
      console.log('[OAuth Transition] Token fallback: Recovered token from _tokenResponse.oauthAccessToken');
    }

    if (!token) {
      console.error('[OAuth Transition Error] STATE: POPUP_RESOLVED -> ERROR_MISSING_ACCESS_TOKEN');
      console.error('[OAuth Transition Error] Firebase auth succeeded but credential.accessToken was empty.');
      addDriveDiagnosticLog('error', 'Firebase Auth completed but OAuth access token was missing in credential result');
      console.groupEnd();
      throw new Error('Failed to obtain Google Drive access token from authentication result. Please ensure Drive permissions were allowed in the Google consent prompt.');
    }

    cachedDriveAccessToken = token;
    const tokenPreview = `${cachedDriveAccessToken.substring(0, 6)}...${cachedDriveAccessToken.substring(cachedDriveAccessToken.length - 4)}`;
    
    console.log('[OAuth Transition] STATE: POPUP_RESOLVED -> AUTHENTICATED_AND_CACHED');
    console.log('[OAuth Transition] STEP 6: OAuth token cached successfully in memory:', tokenPreview);
    addDriveDiagnosticLog('auth', `Successfully authenticated as ${userIdentifier} (Token cached)`);
    
    console.groupEnd();
    return cachedDriveAccessToken;
  } catch (err: any) {
    const errCode = err.code || 'UNKNOWN_AUTH_CODE';
    const errMsg = err.message || 'OAuth popup failed or was closed by user';
    console.error(`[OAuth Transition Error] STATE: AWAITING_POPUP_CALLBACK -> FAILED [Code: ${errCode}]`);
    console.error(`[OAuth Transition Error] Message: ${errMsg}`, err);
    addDriveDiagnosticLog('error', `OAuth Authentication Failed [${errCode}]: ${errMsg}`);
    console.groupEnd();
    throw err;
  }
}

/**
 * Ensure valid access token before API call
 */
async function getValidToken(interactive = true): Promise<string> {
  console.log(`[Google Drive Token Check] Verifying token availability (interactive mode: ${interactive})...`);
  const token = getCachedDriveToken();
  if (token) {
    console.log('[Google Drive Token Check] Access token present in memory cache.');
    return token;
  }
  if (!interactive) {
    console.warn('[Google Drive Token Check] Token missing in non-interactive background mode. Silent request cancelled.');
    throw new Error('Google Drive access token missing or expired. Interactive login required.');
  }
  console.log('[Google Drive Token Check] Token missing in interactive mode. Triggering authenticateGoogleDrive()...');
  return await authenticateGoogleDrive();
}

/**
 * List files in Google Drive (filtered for app backups or general study docs)
 */
export async function listDriveFiles(query?: string, interactive = true): Promise<DriveFileItem[]> {
  console.group('[Google Drive API: listDriveFiles]');
  try {
    addDriveDiagnosticLog('lookup', 'Listing files from Google Drive...');
    const token = await getValidToken(interactive);
    const defaultQuery = "trashed = false and (name contains 'Chronos' or name contains 'Study' or mimeType = 'application/json')";
    const q = encodeURIComponent(query || defaultQuery);

    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,iconLink)&pageSize=50&orderBy=modifiedTime%20desc`;

    console.log('[Google Drive API] GET request URL:', url);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`[Google Drive API] GET Response HTTP Status: ${response.status} (${response.statusText})`);

    if (!response.ok) {
      if (response.status === 401 && interactive) {
        console.warn('[Google Drive API] 401 Unauthorized token received. Clearing token cache and attempting re-authentication...');
        addDriveDiagnosticLog('auth', 'Token expired (401 Unauthorized). Attempting re-authentication...');
        setCachedDriveToken(null);
        const newToken = await authenticateGoogleDrive();
        console.log('[Google Drive API] Retrying GET listDriveFiles with new token...');
        const retryResponse = await fetch(url, {
          method: 'GET',
          headers: { Authorization: `Bearer ${newToken}` },
        });
        if (!retryResponse.ok) {
          const retryErr = await retryResponse.text();
          console.error(`[Google Drive API] listDriveFiles retry failed with HTTP ${retryResponse.status}: ${retryErr}`);
          addDriveDiagnosticLog('error', `List files retry failed with status ${retryResponse.status}`);
          console.groupEnd();
          throw new Error(`Google Drive API Error (${retryResponse.status}): ${retryErr}`);
        }
        const retryData = await retryResponse.json();
        const filesCount = retryData.files?.length || 0;
        console.log(`[Google Drive API] listDriveFiles retry succeeded. Returned ${filesCount} file(s).`);
        addDriveDiagnosticLog('lookup', `Retrieved ${filesCount} file(s) from Drive after token refresh`);
        console.groupEnd();
        return retryData.files || [];
      }
      const errText = await response.text();
      console.error(`[Google Drive API] listDriveFiles HTTP ${response.status} Error details:`, errText);
      addDriveDiagnosticLog('error', `List files error (${response.status}): ${errText}`);
      console.groupEnd();
      throw new Error(`Failed to list Google Drive files (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const filesCount = data.files?.length || 0;
    console.log(`[Google Drive API] listDriveFiles succeeded. Returned ${filesCount} file(s).`);
    addDriveDiagnosticLog('lookup', `Successfully retrieved ${filesCount} file(s) from Drive`);
    console.groupEnd();
    return data.files || [];
  } catch (err: any) {
    console.error('[Google Drive API listDriveFiles Exception]:', err);
    console.groupEnd();
    throw err;
  }
}

/**
 * Upload JSON study backup to Google Drive
 */
export async function uploadJsonToDrive(
  fileName: string,
  jsonData: object | string,
  interactive = true
): Promise<DriveFileItem> {
  console.group('[Google Drive API: uploadJsonToDrive]');
  try {
    addDriveDiagnosticLog('upload', `Creating new file "${fileName}" on Google Drive (POST multipart)...`);
    const token = await getValidToken(interactive);
    const jsonContent = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);
    console.log(`[Google Drive POST Upload] Target filename: "${fileName}" | Payload byte size: ${jsonContent.length} bytes`);

    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      description: 'Chronos Study Time Tracker Backup File',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([jsonContent], { type: 'application/json' }));

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink';

    console.log('[Google Drive POST Upload] Executing POST request to upload endpoint...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    console.log(`[Google Drive POST Upload] Response HTTP Status: ${response.status} (${response.statusText})`);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Google Drive POST Upload Error] HTTP ${response.status}:`, errText);
      addDriveDiagnosticLog('error', `Upload file failed (${response.status}): ${errText}`);
      console.groupEnd();
      throw new Error(`Google Drive Upload Failed (${response.status}): ${errText}`);
    }

    const fileItem: DriveFileItem = await response.json();
    console.log(`[Google Drive POST Upload] File creation successful! File ID: ${fileItem.id} | Name: ${fileItem.name}`);
    addDriveDiagnosticLog('upload', `Created file "${fileItem.name}" on Drive (File ID: ${fileItem.id})`);
    console.groupEnd();
    return fileItem;
  } catch (err: any) {
    console.error('[Google Drive uploadJsonToDrive Exception]:', err);
    console.groupEnd();
    throw err;
  }
}

/**
 * Upload PDF study report directly to Google Drive
 */
export async function uploadPdfToDrive(
  fileName: string,
  pdfBlob: Blob,
  interactive = true
): Promise<DriveFileItem> {
  console.group('[Google Drive API: uploadPdfToDrive]');
  try {
    addDriveDiagnosticLog('upload', `Uploading PDF report "${fileName}" to Google Drive...`);
    const token = await getValidToken(interactive);
    console.log(`[Google Drive PDF Upload] Target filename: "${fileName}" | PDF Blob size: ${pdfBlob.size} bytes`);

    const metadata = {
      name: fileName,
      mimeType: 'application/pdf',
      description: 'Certified Study Performance Report exported from Chronos',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', pdfBlob);

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink';

    console.log('[Google Drive PDF Upload] Executing POST request...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    console.log(`[Google Drive PDF Upload] Response HTTP Status: ${response.status} (${response.statusText})`);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Google Drive PDF Upload Error] HTTP ${response.status}:`, errText);
      addDriveDiagnosticLog('error', `Upload PDF report failed (${response.status}): ${errText}`);
      console.groupEnd();
      throw new Error(`Google Drive PDF Upload Failed (${response.status}): ${errText}`);
    }

    const fileItem: DriveFileItem = await response.json();
    console.log(`[Google Drive PDF Upload] PDF Uploaded successfully! File ID: ${fileItem.id} | Name: ${fileItem.name}`);
    addDriveDiagnosticLog('upload', `Uploaded PDF report "${fileItem.name}" to Drive (File ID: ${fileItem.id})`);
    console.groupEnd();
    return fileItem;
  } catch (err: any) {
    console.error('[Google Drive uploadPdfToDrive Exception]:', err);
    console.groupEnd();
    throw err;
  }
}

/**
 * Read text/JSON file contents from Google Drive
 */
export async function getDriveFileContent(fileId: string, interactive = true): Promise<string> {
  console.group('[Google Drive API: getDriveFileContent]');
  try {
    addDriveDiagnosticLog('restore', `Downloading file content for File ID: ${fileId}...`);
    const token = await getValidToken(interactive);
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    console.log(`[Google Drive Download] Requesting media URL for File ID: ${fileId}...`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`[Google Drive Download] Response HTTP Status: ${response.status} (${response.statusText})`);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Google Drive Download Error] HTTP ${response.status}:`, errText);
      addDriveDiagnosticLog('error', `Download file content failed (${response.status}): ${errText}`);
      console.groupEnd();
      throw new Error(`Failed to download file content from Google Drive (${response.status}): ${errText}`);
    }

    const text = await response.text();
    console.log(`[Google Drive Download] Download completed successfully. Received ${text.length} characters / bytes.`);
    addDriveDiagnosticLog('restore', `Successfully downloaded file content (${text.length} bytes)`);
    console.groupEnd();
    return text;
  } catch (err: any) {
    console.error('[Google Drive getDriveFileContent Exception]:', err);
    console.groupEnd();
    throw err;
  }
}

/**
 * Delete a file from Google Drive (Mandatory user confirmation should be handled in UI before calling this)
 */
export async function deleteDriveFile(fileId: string, interactive = true): Promise<boolean> {
  console.group('[Google Drive API: deleteDriveFile]');
  try {
    addDriveDiagnosticLog('upload', `Deleting file ${fileId} from Google Drive...`);
    const token = await getValidToken(interactive);
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;

    console.log(`[Google Drive Delete] Sending DELETE request for File ID: ${fileId}...`);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`[Google Drive Delete] Response HTTP Status: ${response.status} (${response.statusText})`);

    if (!response.ok && response.status !== 204) {
      const errText = await response.text();
      console.error(`[Google Drive Delete Error] HTTP ${response.status}:`, errText);
      addDriveDiagnosticLog('error', `Delete file failed (${response.status}): ${errText}`);
      console.groupEnd();
      throw new Error(`Failed to delete file from Google Drive (${response.status}): ${errText}`);
    }

    console.log(`[Google Drive Delete] File ID ${fileId} successfully deleted.`);
    addDriveDiagnosticLog('upload', `Successfully deleted file ${fileId} from Google Drive`);
    console.groupEnd();
    return true;
  } catch (err: any) {
    console.error('[Google Drive deleteDriveFile Exception]:', err);
    console.groupEnd();
    throw err;
  }
}

/**
 * Get Google Drive storage quota info
 */
export async function getDriveStorageAbout(interactive = true): Promise<{ limit?: string; usage?: string; userEmail?: string }> {
  console.group('[Google Drive API: getDriveStorageAbout]');
  try {
    console.log('[Google Drive About API] Requesting storageQuota and user info...');
    const token = await getValidToken(interactive);
    const url = 'https://www.googleapis.com/drive/v3/about?fields=storageQuota,user';

    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log(`[Google Drive About API] Response HTTP Status: ${response.status} (${response.statusText})`);

    if (!response.ok) {
      console.warn(`[Google Drive About API Warning] HTTP ${response.status}`);
      console.groupEnd();
      return {};
    }
    const data = await response.json();
    console.log('[Google Drive About API] User Email:', data.user?.emailAddress || 'User Email Retained');
    console.log(`[Google Drive About API] Storage Quota: Usage = ${data.storageQuota?.usage || 0} bytes | Limit = ${data.storageQuota?.limit || 'Unlimited'}`);
    console.groupEnd();
    return {
      limit: data.storageQuota?.limit,
      usage: data.storageQuota?.usage,
      userEmail: data.user?.emailAddress,
    };
  } catch (err: any) {
    console.warn('[Google Drive About API Notice]:', err.message || err);
    console.groupEnd();
    return {};
  }
}

export const DEDICATED_BACKUP_FILENAME = 'StudyTrackerBackup.json';

/**
 * Find existing dedicated backup file on Google Drive
 */
export async function findDedicatedBackupFile(interactive = false): Promise<DriveFileItem | null> {
  console.group('[Google Drive Backup Workflow: findDedicatedBackupFile]');
  try {
    console.log(`[Google Drive Backup Lookup] Searching for dedicated file: "${DEDICATED_BACKUP_FILENAME}"...`);
    addDriveDiagnosticLog('lookup', `Searching for dedicated backup file "${DEDICATED_BACKUP_FILENAME}"...`);
    const token = await getValidToken(interactive);
    const q = encodeURIComponent(`trashed = false and name = '${DEDICATED_BACKUP_FILENAME}'`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink)&pageSize=1`;

    console.log('[Google Drive Backup Lookup] GET request URL:', url);
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log(`[Google Drive Backup Lookup] Response HTTP Status: ${response.status} (${response.statusText})`);

    if (!response.ok) {
      if (response.status === 401 && interactive) {
        console.warn('[Google Drive Backup Lookup] 401 Unauthorized token. Attempting re-auth...');
        addDriveDiagnosticLog('auth', 'Token 401 expired during backup lookup. Retrying with auth...');
        setCachedDriveToken(null);
        const newToken = await authenticateGoogleDrive();
        const retryResponse = await fetch(url, {
          method: 'GET',
          headers: { Authorization: `Bearer ${newToken}` },
        });
        if (!retryResponse.ok) {
          console.error('[Google Drive Backup Lookup] Retry failed with status:', retryResponse.status);
          console.groupEnd();
          return null;
        }
        const data = await retryResponse.json();
        const found = data.files?.[0] || null;
        if (found) {
          console.log('[Google Drive Backup Lookup] Found backup file via retry! ID:', found.id);
          addDriveDiagnosticLog('lookup', `Found dedicated backup file (File ID: ${found.id})`);
        } else {
          console.log('[Google Drive Backup Lookup] No backup file found via retry.');
          addDriveDiagnosticLog('lookup', `No dedicated backup file "${DEDICATED_BACKUP_FILENAME}" found on Drive yet`);
        }
        console.groupEnd();
        return found;
      }
      console.warn('[Google Drive Backup Lookup] HTTP error status:', response.status);
      console.groupEnd();
      return null;
    }

    const data = await response.json();
    const found = data.files?.[0] || null;
    if (found) {
      console.log(`[Google Drive Backup Lookup] Dedicated backup file exists! File ID: ${found.id} | Size: ${found.size || 'unknown'} bytes | Modified: ${found.modifiedTime}`);
      addDriveDiagnosticLog('lookup', `Found dedicated backup file (File ID: ${found.id})`);
    } else {
      console.log(`[Google Drive Backup Lookup] Dedicated backup file "${DEDICATED_BACKUP_FILENAME}" does not exist yet.`);
      addDriveDiagnosticLog('lookup', `No dedicated backup file "${DEDICATED_BACKUP_FILENAME}" found on Drive yet`);
    }
    console.groupEnd();
    return found;
  } catch (err: any) {
    console.log('[Google Drive Backup Lookup Notice]:', err.message || 'Token unauthenticated');
    addDriveDiagnosticLog('lookup', `Dedicated backup lookup notice: ${err.message || 'Token unauthenticated'}`);
    console.groupEnd();
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
  console.group('[Google Drive API: updateJsonInDrive]');
  try {
    addDriveDiagnosticLog('upload', `PATCH updating existing file ${fileId} on Google Drive...`);
    const token = await getValidToken(interactive);
    const jsonContent = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);
    console.log(`[Google Drive PATCH Update] Target File ID: ${fileId} | Payload byte size: ${jsonContent.length} bytes`);

    const metadata = {
      mimeType: 'application/json',
      description: 'Chronos Dedicated Study Time Tracker Backup File',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([jsonContent], { type: 'application/json' }));

    const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink`;

    console.log(`[Google Drive PATCH Update] Sending PATCH multipart request to URL: ${url}`);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    console.log(`[Google Drive PATCH Update] Response HTTP Status: ${response.status} (${response.statusText})`);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[Google Drive PATCH Update] File ID ${fileId} returned 404 (file deleted or missing on Drive). Falling back to POST create...`);
        addDriveDiagnosticLog('upload', `File ID ${fileId} returned 404. Re-creating dedicated file on Drive...`);
        console.groupEnd();
        return await uploadJsonToDrive(DEDICATED_BACKUP_FILENAME, jsonData, interactive);
      }
      const errText = await response.text();
      console.error(`[Google Drive PATCH Update Error] HTTP ${response.status}:`, errText);
      addDriveDiagnosticLog('error', `PATCH update file failed (${response.status}): ${errText}`);
      console.groupEnd();
      throw new Error(`Google Drive Update Failed (${response.status}): ${errText}`);
    }

    const updatedItem: DriveFileItem = await response.json();
    console.log(`[Google Drive PATCH Update] In-place update succeeded! File ID: ${updatedItem.id} | Name: ${updatedItem.name} | Size: ${updatedItem.size} bytes`);
    addDriveDiagnosticLog('upload', `Successfully updated "${updatedItem.name}" in-place (File ID: ${updatedItem.id})`);
    console.groupEnd();
    return updatedItem;
  } catch (err: any) {
    console.error('[Google Drive updateJsonInDrive Exception]:', err);
    console.groupEnd();
    throw err;
  }
}

/**
 * Save or Update dedicated backup file (guarantees single file on Drive)
 */
export async function saveOrUpdateDedicatedBackup(jsonData: object, interactive = false): Promise<DriveFileItem> {
  console.group('[Google Drive Dedicated Backup Pipeline]');
  try {
    console.log('[Google Drive Dedicated Backup Pipeline] Step 1: Checking for existing backup file on Drive...');
    const existingFile = await findDedicatedBackupFile(interactive);
    if (existingFile) {
      console.log(`[Google Drive Dedicated Backup Pipeline] Step 2: Existing backup file found (ID: ${existingFile.id}). Executing PATCH in-place update...`);
      const result = await updateJsonInDrive(existingFile.id, jsonData, interactive);
      console.groupEnd();
      return result;
    } else {
      console.log('[Google Drive Dedicated Backup Pipeline] Step 2: No existing file found. Executing POST multipart creation...');
      const result = await uploadJsonToDrive(DEDICATED_BACKUP_FILENAME, jsonData, interactive);
      console.groupEnd();
      return result;
    }
  } catch (err: any) {
    console.error('[Google Drive Dedicated Backup Pipeline Exception]:', err);
    console.groupEnd();
    throw err;
  }
}

/**
 * Disconnect Google Drive session
 */
export function disconnectGoogleDrive() {
  console.log('[Google Drive Session] Disconnecting and clearing in-memory access token.');
  setCachedDriveToken(null);
  addDriveDiagnosticLog('auth', 'Google Drive disconnected by user');
}

