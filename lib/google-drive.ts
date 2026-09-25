export const FORGE_DRIVE_FOLDER = "Forge";

const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const DRIVE_SHORTCUT_MIME_TYPE = "application/vnd.google-apps.shortcut";

export type DriveFolder = {
  id:string;
  name:string;
  mimeType?:string;
  shortcutDetails?:{targetId?:string;targetMimeType?:string};
};

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
  return `trashed = false and name = '${driveQueryLiteral(FORGE_DRIVE_FOLDER)}' and 'root' in parents and (mimeType = '${DRIVE_FOLDER_MIME_TYPE}' or mimeType = '${DRIVE_SHORTCUT_MIME_TYPE}')`;
}

export function selectForgeFolder(files:DriveFolder[]) {
  const matches=files.flatMap(file=>{
    if (file.name.trim().toLowerCase()!==FORGE_DRIVE_FOLDER.toLowerCase()) return [];
    if (!file.mimeType||file.mimeType===DRIVE_FOLDER_MIME_TYPE) return [{id:file.id,name:file.name}];
    if (file.mimeType===DRIVE_SHORTCUT_MIME_TYPE&&file.shortcutDetails?.targetMimeType===DRIVE_FOLDER_MIME_TYPE&&file.shortcutDetails.targetId) {
      return [{id:file.shortcutDetails.targetId,name:file.name}];
    }
    return [];
  }).filter((file,index,all)=>all.findIndex(candidate=>candidate.id===file.id)===index);
  if (!matches.length) throw new ForgeFolderSourceError(`${FORGE_DRIVE_FOLDER} folder was not found in Google Drive root`,"forge_folder_not_found");
  if (matches.length>1) throw new ForgeFolderSourceError(`Multiple ${FORGE_DRIVE_FOLDER} folders were found in Google Drive root`,"forge_folder_ambiguous");
  return matches[0];
}

export function queryInsideFolder(folderId:string,condition:string) {
  return `'${driveQueryLiteral(folderId)}' in parents and ${condition}`;
}
