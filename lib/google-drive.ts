export const FORGE_DRIVE_FOLDER = "Forge";

export type DriveFolder = { id:string; name:string };

export class ForgeFolderSourceError extends Error {
  readonly code:"forge_folder_not_found"|"forge_folder_ambiguous";

  constructor(message:string,code:"forge_folder_not_found"|"forge_folder_ambiguous") {
    super(message);
    this.code=code;
  }
}

export function driveQueryLiteral(value:string) {
  return value.replace(/\\/g,"\\\\").replace(/'/g,"\\'");
}

export function forgeFolderQuery() {
  return `mimeType = 'application/vnd.google-apps.folder' and trashed = false and name = '${driveQueryLiteral(FORGE_DRIVE_FOLDER)}' and 'root' in parents`;
}

export function selectForgeFolder(files:DriveFolder[]) {
  const matches=files.filter(file=>file.name.trim().toLowerCase()===FORGE_DRIVE_FOLDER.toLowerCase());
  if (!matches.length) throw new ForgeFolderSourceError(`${FORGE_DRIVE_FOLDER} folder was not found in Google Drive root`,"forge_folder_not_found");
  if (matches.length>1) throw new ForgeFolderSourceError(`Multiple ${FORGE_DRIVE_FOLDER} folders were found in Google Drive root`,"forge_folder_ambiguous");
  return matches[0];
}

export function queryInsideFolder(folderId:string,condition:string) {
  return `'${driveQueryLiteral(folderId)}' in parents and ${condition}`;
}
