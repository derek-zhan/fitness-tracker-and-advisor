import assert from "node:assert/strict";
import test from "node:test";
import { driveQueryLiteral, ForgeFolderSourceError, forgeFolderQuery, queryInsideFolder, selectForgeFolder } from "../lib/google-drive.ts";

test("finds one top-level Forge folder",()=>{
  assert.match(forgeFolderQuery(),/name = 'Forge'/);
  assert.match(forgeFolderQuery(),/'root' in parents/);
  assert.match(forgeFolderQuery(),/application\/vnd\.google-apps\.folder/);
  assert.match(forgeFolderQuery(),/application\/vnd\.google-apps\.shortcut/);
  assert.deepEqual(selectForgeFolder([{id:"forge-id",name:"Forge"}]),{id:"forge-id",name:"Forge"});
  assert.throws(()=>selectForgeFolder([]),(error:unknown)=>error instanceof ForgeFolderSourceError&&error.code==="forge_folder_not_found");
  assert.throws(()=>selectForgeFolder([{id:"one",name:"Forge"},{id:"two",name:" forge "}]),(error:unknown)=>error instanceof ForgeFolderSourceError&&error.code==="forge_folder_ambiguous");
});

test("resolves a top-level Forge shortcut to its shared folder",()=>{
  const shortcut={
    id:"shortcut-id",
    name:"Forge",
    mimeType:"application/vnd.google-apps.shortcut",
    shortcutDetails:{targetId:"shared-folder-id",targetMimeType:"application/vnd.google-apps.folder"},
  };
  assert.deepEqual(selectForgeFolder([shortcut]),{id:"shared-folder-id",name:"Forge"});
  assert.deepEqual(selectForgeFolder([shortcut,{...shortcut,id:"second-shortcut-id"}]),{id:"shared-folder-id",name:"Forge"});
  assert.throws(()=>selectForgeFolder([{...shortcut,shortcutDetails:{targetId:"sheet-id",targetMimeType:"application/vnd.google-apps.spreadsheet"}}]),(error:unknown)=>error instanceof ForgeFolderSourceError&&error.code==="forge_folder_not_found");
});

test("limits Drive queries to children of the Forge folder",()=>{
  const query=queryInsideFolder("forge-id","mimeType = 'application/vnd.google-apps.spreadsheet'");
  assert.equal(query,"'forge-id' in parents and mimeType = 'application/vnd.google-apps.spreadsheet'");
  assert.equal(driveQueryLiteral("folder\\'id"),"folder\\\\\\'id");
});
