import assert from "node:assert/strict";
import test from "node:test";
import { driveQueryLiteral, ForgeFolderSourceError, forgeFolderQuery, queryInsideFolder, selectForgeFolder } from "../lib/google-drive.ts";

test("finds one top-level Forge folder",()=>{
  assert.match(forgeFolderQuery(),/name = 'Forge'/);
  assert.match(forgeFolderQuery(),/'root' in parents/);
  assert.deepEqual(selectForgeFolder([{id:"forge-id",name:"Forge"}]),{id:"forge-id",name:"Forge"});
  assert.throws(()=>selectForgeFolder([]),(error:unknown)=>error instanceof ForgeFolderSourceError&&error.code==="forge_folder_not_found");
  assert.throws(()=>selectForgeFolder([{id:"one",name:"Forge"},{id:"two",name:" forge "}]),(error:unknown)=>error instanceof ForgeFolderSourceError&&error.code==="forge_folder_ambiguous");
});

test("limits Drive queries to children of the Forge folder",()=>{
  const query=queryInsideFolder("forge-id","mimeType = 'application/vnd.google-apps.spreadsheet'");
  assert.equal(query,"'forge-id' in parents and mimeType = 'application/vnd.google-apps.spreadsheet'");
  assert.equal(driveQueryLiteral("folder\\'id"),"folder\\\\\\'id");
});
