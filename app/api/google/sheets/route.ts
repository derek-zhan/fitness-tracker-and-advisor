import { getChatGPTUser } from "../../../chatgpt-auth";
import { accessTokenForUser, listGoogleSpreadsheets } from "../../../../lib/google";

export async function GET(){
  const user=await getChatGPTUser();
  if(!user)return Response.json({error:"Sign in to Forge before connecting Google.",code:"site_auth_required"},{status:401});
  const accessToken=await accessTokenForUser(user.userId);
  if(!accessToken)return Response.json({error:"Connect Google to choose a spreadsheet.",code:"google_auth_required"},{status:401});
  try{return Response.json({sheets:await listGoogleSpreadsheets(accessToken)},{headers:{"cache-control":"no-store"}})}
  catch(error){return Response.json({error:"Reconnect Google so Forge can show your spreadsheets.",code:"google_reauthorize_required",detail:error instanceof Error?error.message:undefined},{status:403})}
}
