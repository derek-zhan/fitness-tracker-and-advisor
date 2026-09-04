"use client";

export type GooglePickerConfig = {
  clientId: string;
  apiKey: string;
  appId: string;
};

export type PickedGoogleSheet = {
  id: string;
  name: string;
  url: string;
  accessToken: string;
};

type TokenResponse = { access_token?: string; error?: string; error_description?: string };
type PickerDocument = { id?: string; name?: string; url?: string };
type PickerResponse = { action?: string; docs?: PickerDocument[] };
type PickerBuilder = {
  setDeveloperKey: (key: string) => PickerBuilder;
  setAppId: (id: string) => PickerBuilder;
  setOAuthToken: (token: string) => PickerBuilder;
  setOrigin: (origin: string) => PickerBuilder;
  setTitle: (title: string) => PickerBuilder;
  addView: (view: string) => PickerBuilder;
  setCallback: (callback: (response: PickerResponse) => void) => PickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
};

declare global {
  interface Window {
    gapi?: {
      load: (name: string, options: { callback: () => void; onerror: () => void; timeout: number; ontimeout: () => void }) => void;
    };
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type?: string }) => void;
          }) => { requestAccessToken: (options?: { prompt?: string }) => void };
        };
      };
      picker?: {
        Action: { PICKED: string; CANCEL: string };
        ViewId: { SPREADSHEETS: string };
        PickerBuilder: new () => PickerBuilder;
      };
    };
  }
}

function loadScript(id: string, src: string, ready: () => boolean) {
  if (ready()) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const onLoad = () => resolve();
    const onError = () => reject(new Error("Google could not be loaded. Please try again."));
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.id = id;
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

let preparation: Promise<void> | null = null;

export function prepareGooglePicker() {
  if (preparation) return preparation;
  preparation = Promise.all([
    loadScript("google-identity-services", "https://accounts.google.com/gsi/client", () => Boolean(window.google?.accounts?.oauth2)),
    loadScript("google-api-client", "https://apis.google.com/js/api.js", () => Boolean(window.gapi)),
  ]).then(() => new Promise<void>((resolve, reject) => {
    if (!window.gapi) {
      reject(new Error("Google Drive could not be loaded."));
      return;
    }
    window.gapi.load("picker", {
      callback: resolve,
      onerror: () => reject(new Error("Google Drive picker could not be loaded.")),
      timeout: 10_000,
      ontimeout: () => reject(new Error("Google Drive picker timed out.")),
    });
  })).catch(error => {
    preparation = null;
    throw error;
  });
  return preparation;
}

function requestAccessToken(clientId: string) {
  return new Promise<string>((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      reject(new Error("Google sign-in is not ready yet."));
      return;
    }
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: response => {
        if (response.access_token) resolve(response.access_token);
        else reject(new Error(response.error_description || "Google access was not granted."));
      },
      error_callback: error => reject(new Error(error.type === "popup_closed" ? "Google sign-in was closed." : "Google sign-in could not open.")),
    });
    client.requestAccessToken({ prompt: "select_account" });
  });
}

export async function pickGoogleSheet(config: GooglePickerConfig) {
  await prepareGooglePicker();
  const token = await requestAccessToken(config.clientId);
  const pickerApi = window.google?.picker;
  if (!pickerApi) throw new Error("Google Drive picker is not ready.");

  return new Promise<PickedGoogleSheet | null>((resolve, reject) => {
    try {
      const picker = new pickerApi.PickerBuilder()
        .setDeveloperKey(config.apiKey)
        .setAppId(config.appId)
        .setOAuthToken(token)
        .setOrigin(window.location.origin)
        .setTitle("Choose a workout spreadsheet")
        .addView(pickerApi.ViewId.SPREADSHEETS)
        .setCallback(response => {
          if (response.action === pickerApi.Action.CANCEL) {
            resolve(null);
            return;
          }
          if (response.action !== pickerApi.Action.PICKED) return;
          const document = response.docs?.[0];
          if (!document?.id) {
            reject(new Error("The selected spreadsheet could not be read."));
            return;
          }
          resolve({
            id: document.id,
            name: document.name || "Google Sheet",
            url: document.url || `https://docs.google.com/spreadsheets/d/${document.id}/edit`,
            accessToken: token,
          });
        })
        .build();
      picker.setVisible(true);
    } catch {
      reject(new Error("Google Drive picker could not be opened."));
    }
  });
}
