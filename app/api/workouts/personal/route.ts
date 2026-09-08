import { allowedConnectionForRequest } from "../../../../lib/device-auth";
import { isOwnerGoogleEmail, ownerWorkouts } from "../../../../lib/owner-workouts";

export async function GET(request:Request){
  const identity=await allowedConnectionForRequest(request);
  if(identity.status==="unauthorized")return Response.json({error:"This Google account is not authorized"},{status:403});
  if(!identity.connection)return Response.json({error:"Connect Google first"},{status:401});
  if(!isOwnerGoogleEmail(identity.connection.email))return Response.json({error:"Personal programs are not available for this account"},{status:403});
  return Response.json({workouts:ownerWorkouts},{headers:{"cache-control":"private, no-store"}});
}
