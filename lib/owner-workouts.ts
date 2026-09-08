export const OWNER_GOOGLE_EMAIL = "zhanhangsky@gmail.com";

export type ProgramId = "strength4" | "glute6" | "weekly7";
export type Exercise = { order:string; name:string; sets:number; reps:number; repRange:string; load:number; unit:"lb"|"body"|"minutes"; rest:number; cue:string; bodyLabel?:string; videoUrl?:string; sheetRow?:number };
export type Workout = { program:ProgramId; day:number; dayName?:string; type:string; focus:string; accent:string; sheetId:string; sheetUrl:string; lastDate:string; exercises:Exercise[]; warmupVideoUrl?:string; cardio?:string; sheetTab?:string; previousDate?:string; nextWeek?:string; cardioStatusCell?:string; notesCell?:string; repsColumn?:string; loadColumn?:string; commentsColumn?:string };

export function isOwnerGoogleEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === OWNER_GOOGLE_EMAIL;
}

export const ownerWorkouts:Workout[] = [
  { program:"strength4", day:1, type:"Upper", focus:"Chest · Back · Arms", accent:"PUSH + PULL", lastDate:"Aug 24", sheetId:"1CxsM-j0Nq49uDytCi9pEuQ2dHrf8LSt8Sv6AMjeA8xs", sheetUrl:"https://docs.google.com/spreadsheets/d/1CxsM-j0Nq49uDytCi9pEuQ2dHrf8LSt8Sv6AMjeA8xs/edit", exercises:[
    {order:"A1",name:"Dumbbell Chest Press",sets:4,reps:10,repRange:"8–10",load:50,unit:"lb",rest:90,cue:"Elbows at 45°. Lower to mid-chest and press in a straight path."},
    {order:"B1",name:"Single Arm Dumbbell Row",sets:4,reps:10,repRange:"8–10",load:50,unit:"lb",rest:90,cue:"Hinge at the hips. Pull through your elbow and pause at the top."},
    {order:"C1",name:"Cable Lateral Raise",sets:3,reps:10,repRange:"10–12",load:20,unit:"lb",rest:90,cue:"Soft elbow. Lead with the elbow and control the lowering phase."},
    {order:"D1",name:"Single Arm Cable Lat Pulldown",sets:4,reps:10,repRange:"8–10",load:90,unit:"lb",rest:90,cue:"Keep ribs down. Drive the elbow toward your hip."},
    {order:"E1",name:"Cable Chest Fly",sets:3,reps:12,repRange:"12–15",load:45,unit:"lb",rest:90,cue:"Keep a soft bend in the elbow and squeeze through the chest."},
    {order:"F1",name:"Single Arm Cable Bicep Curl",sets:3,reps:12,repRange:"12–15",load:30,unit:"lb",rest:0,cue:"Keep your elbow pinned. Curl fully and lower slowly."},
    {order:"F2",name:"Single Arm Dumbbell Tricep Extension",sets:3,reps:12,repRange:"12–15",load:30,unit:"lb",rest:30,cue:"Keep the elbow steady and reach a full lockout."}
  ]},
  { program:"strength4", day:2, type:"Lower", focus:"Glutes · Hamstrings · Core", accent:"POSTERIOR CHAIN", lastDate:"Aug 7", sheetId:"1oDeg32DH3bvbfQ1-Q3-f2-6shawAsgBZVz-kbN3aqTI", sheetUrl:"https://docs.google.com/spreadsheets/d/1oDeg32DH3bvbfQ1-Q3-f2-6shawAsgBZVz-kbN3aqTI/edit", exercises:[
    {order:"A1",name:"Single Leg Glute Bridge",sets:4,reps:12,repRange:"8–10",load:70,unit:"lb",rest:180,cue:"Drive through the planted heel and finish with the glute."},
    {order:"B1",name:"Romanian Dumbbell Deadlift",sets:4,reps:12,repRange:"8–10",load:50,unit:"lb",rest:180,cue:"Push your hips back, keep lats tight, and stand tall."},
    {order:"C1",name:"Cable Lateral Leg Raise",sets:3,reps:12,repRange:"10–12",load:50,unit:"lb",rest:90,cue:"Stay tall and move from the hip without swinging."},
    {order:"D1",name:"Leg Press Calf Raise",sets:4,reps:12,repRange:"10–12",load:50,unit:"lb",rest:90,cue:"Use a full stretch and pause at the top of every rep."},
    {order:"E1",name:"Cable Crunch",sets:3,reps:15,repRange:"12–15",load:110,unit:"lb",rest:90,cue:"Curl ribs toward hips; let the abs move the load."}
  ]},
  { program:"strength4", day:3, type:"Upper", focus:"Chest · Shoulders · Back", accent:"PRESS + ROW", lastDate:"Jul 31", sheetId:"1xUrPXVHpaj5nF78YExmyB-s_tu_3Qj8vUrTXUk-43JY", sheetUrl:"https://docs.google.com/spreadsheets/d/1xUrPXVHpaj5nF78YExmyB-s_tu_3Qj8vUrTXUk-43JY/edit", exercises:[
    {order:"A1",name:"Incline Dumbbell Chest Press",sets:4,reps:10,repRange:"8–10",load:40,unit:"lb",rest:180,cue:"Set shoulders down and back. Press up without shrugging."},
    {order:"B1",name:"Chest Supported Dumbbell Row",sets:4,reps:10,repRange:"8–10",load:40,unit:"lb",rest:180,cue:"Keep chest planted and squeeze shoulder blades together."},
    {order:"C1",name:"Dumbbell Shoulder Press",sets:4,reps:10,repRange:"8–10",load:30,unit:"lb",rest:90,cue:"Brace your trunk and finish with biceps beside ears."},
    {order:"D1",name:"Single Arm Cable Lat Pulldown",sets:4,reps:10,repRange:"8–10",load:90,unit:"lb",rest:90,cue:"Keep ribs down and pull the elbow toward your hip."},
    {order:"E1",name:"Dumbbell Chest Fly",sets:4,reps:10,repRange:"8–10",load:30,unit:"lb",rest:90,cue:"Open with control and stop when your upper arm meets the torso."},
    {order:"F1",name:"Cable Bicep Curl",sets:3,reps:12,repRange:"12–15",load:70,unit:"lb",rest:0,cue:"Keep shoulders quiet and own the lowering phase."},
    {order:"F2",name:"Sit Ups to Toe Touches",sets:3,reps:12,repRange:"12–15",load:0,unit:"body",rest:30,cue:"Exhale as you reach and keep the movement smooth."}
  ]},
  { program:"strength4", day:4, type:"Lower", focus:"Quads · Glutes · Core", accent:"LEGS + TRUNK", lastDate:"Aug 1", sheetId:"1LO8rQ2M7gyqeewxTRJgct1GcGnW_g3D0QRas9bhf14w", sheetUrl:"https://docs.google.com/spreadsheets/d/1LO8rQ2M7gyqeewxTRJgct1GcGnW_g3D0QRas9bhf14w/edit", exercises:[
    {order:"A1",name:"Leg Press Machine",sets:4,reps:12,repRange:"8–10",load:70,unit:"lb",rest:180,cue:"Keep your whole foot planted and control the bottom position."},
    {order:"B1",name:"Bulgarian Split Squat",sets:3,reps:10,repRange:"10–12",load:0,unit:"body",rest:180,cue:"Drop the back knee straight down and drive through the front foot."},
    {order:"C1",name:"Forward Lunge",sets:4,reps:10,repRange:"8–10",load:35,unit:"lb",rest:90,cue:"Step long, stay balanced, and push the floor away."},
    {order:"D1",name:"Kettlebell Deadbug",sets:3,reps:12,repRange:"12–15",load:0,unit:"body",rest:90,cue:"Keep the low back gently pressed down while limbs move."},
    {order:"E1",name:"Plank Jacks",sets:3,reps:15,repRange:"12–15",load:0,unit:"body",rest:90,cue:"Keep hips level and land softly on every rep."}
  ]},
  { program:"glute6", day:1, dayName:"Monday", type:"Heavy", focus:"Thrust · Hinge · Split Squat", accent:"GLUTE STRENGTH", lastDate:"New", sheetId:"1wdtWBjsO4jhfMMhQ7AO9O3RLbqcFjnOFtsMEAZFepZ4", sheetUrl:"https://docs.google.com/spreadsheets/d/1wdtWBjsO4jhfMMhQ7AO9O3RLbqcFjnOFtsMEAZFepZ4/edit", exercises:[
    {order:"A1",name:"Hip Thrust",sets:3,reps:10,repRange:"8–12",load:0,unit:"lb",rest:90,cue:"Tuck your ribs, drive through your heels, and pause at full hip extension."},
    {order:"B1",name:"Romanian Deadlift",sets:3,reps:10,repRange:"8–12",load:0,unit:"lb",rest:90,cue:"Push your hips back with a soft knee bend, then stand tall through the glutes."},
    {order:"C1",name:"Bulgarian Split Squat",sets:3,reps:10,repRange:"8–12",load:0,unit:"lb",rest:90,cue:"Lower straight down, keep the front foot planted, and drive through the heel."},
    {order:"D1",name:"Stair Master Finisher",sets:1,reps:10,repRange:"5–10 min",load:0,unit:"minutes",rest:0,cue:"Stay tall, use the rails only for balance, and keep steady pressure through each step."}
  ]},
  { program:"glute6", day:2, dayName:"Tuesday", type:"Light", focus:"Abduction · Bridge · Stability", accent:"GLUTE CONTROL", lastDate:"New", sheetId:"1wdtWBjsO4jhfMMhQ7AO9O3RLbqcFjnOFtsMEAZFepZ4", sheetUrl:"https://docs.google.com/spreadsheets/d/1wdtWBjsO4jhfMMhQ7AO9O3RLbqcFjnOFtsMEAZFepZ4/edit", exercises:[
    {order:"A1",name:"Banded Side Steps",sets:3,reps:15,repRange:"15 / side",load:0,unit:"body",bodyLabel:"BAND",rest:45,cue:"Keep constant band tension and take controlled steps without rocking your torso."},
    {order:"B1",name:"Dumbbell Glute Bridge",sets:3,reps:10,repRange:"8–12",load:0,unit:"lb",rest:60,cue:"Drive through your heels and squeeze at the top without overextending your back."},
    {order:"C1",name:"Banded Kickbacks",sets:3,reps:10,repRange:"8–12",load:0,unit:"body",bodyLabel:"BAND",rest:45,cue:"Brace your trunk and extend from the hip without arching your lower back."},
    {order:"D1",name:"Hip Airplanes",sets:3,reps:10,repRange:"8–12",load:0,unit:"body",bodyLabel:"BODYWEIGHT",rest:45,cue:"Move slowly from the hip and keep your standing knee softly bent."}
  ]},
  { program:"glute6", day:3, dayName:"Wednesday", type:"Heavy", focus:"Thrust · Step-Up · Lunge", accent:"GLUTE STRENGTH", lastDate:"Logged", sheetId:"1wdtWBjsO4jhfMMhQ7AO9O3RLbqcFjnOFtsMEAZFepZ4", sheetUrl:"https://docs.google.com/spreadsheets/d/1wdtWBjsO4jhfMMhQ7AO9O3RLbqcFjnOFtsMEAZFepZ4/edit", exercises:[
    {order:"A1",name:"Hip Thrust",sets:3,reps:12,repRange:"8–12",load:70,unit:"lb",rest:90,cue:"Tuck your ribs, drive through your heels, and pause at full hip extension."},
    {order:"B1",name:"Box Step-Up",sets:3,reps:10,repRange:"8–12",load:40,unit:"lb",rest:90,cue:"Plant the whole foot, lean slightly forward, and let the working leg lift you."},
    {order:"C1",name:"Curtsy Lunge",sets:3,reps:10,repRange:"8–12",load:35,unit:"lb",rest:90,cue:"Step behind on a diagonal while keeping the front knee tracking over the foot."},
    {order:"D1",name:"Stair Master Finisher",sets:1,reps:10,repRange:"5–10 min",load:0,unit:"minutes",rest:0,cue:"Stay tall, use the rails only for balance, and keep steady pressure through each step."}
  ]},
  { program:"glute6", day:4, dayName:"Thursday", type:"Light", focus:"Hinge · Abduction · Stability", accent:"GLUTE CONTROL", lastDate:"New", sheetId:"1wdtWBjsO4jhfMMhQ7AO9O3RLbqcFjnOFtsMEAZFepZ4", sheetUrl:"https://docs.google.com/spreadsheets/d/1wdtWBjsO4jhfMMhQ7AO9O3RLbqcFjnOFtsMEAZFepZ4/edit", exercises:[
    {order:"A1",name:"B-Stance Dumbbell RDL",sets:3,reps:10,repRange:"8–12",load:0,unit:"lb",rest:60,cue:"Keep most of your weight on the front leg and push that hip back."},
    {order:"B1",name:"Banded Side Steps",sets:3,reps:15,repRange:"15 / side",load:0,unit:"body",bodyLabel:"BAND",rest:45,cue:"Keep constant band tension and take controlled steps without rocking your torso."},
    {order:"C1",name:"Bodyweight Bulgarian Split Squat",sets:3,reps:10,repRange:"8–12",load:0,unit:"body",bodyLabel:"BODYWEIGHT",rest:60,cue:"Use a controlled range, keep the front foot planted, and drive through the heel."}
  ]},
  { program:"glute6", day:5, dayName:"Friday", type:"Heavy", focus:"Hinge · Split Squat · Lunge", accent:"GLUTE STRENGTH", lastDate:"New", sheetId:"1wdtWBjsO4jhfMMhQ7AO9O3RLbqcFjnOFtsMEAZFepZ4", sheetUrl:"https://docs.google.com/spreadsheets/d/1wdtWBjsO4jhfMMhQ7AO9O3RLbqcFjnOFtsMEAZFepZ4/edit", exercises:[
    {order:"A1",name:"Romanian Deadlift",sets:3,reps:10,repRange:"8–12",load:0,unit:"lb",rest:90,cue:"Push your hips back with a soft knee bend, then stand tall through the glutes."},
    {order:"B1",name:"Bulgarian Split Squat",sets:3,reps:10,repRange:"8–12",load:0,unit:"lb",rest:90,cue:"Lower straight down, keep the front foot planted, and drive through the heel."},
    {order:"C1",name:"Curtsy Lunge",sets:3,reps:10,repRange:"8–12",load:0,unit:"lb",rest:90,cue:"Step behind on a diagonal while keeping the front knee tracking over the foot."},
    {order:"D1",name:"Stair Master Finisher",sets:1,reps:10,repRange:"5–10 min",load:0,unit:"minutes",rest:0,cue:"Stay tall, use the rails only for balance, and keep steady pressure through each step."}
  ]},
  { program:"glute6", day:6, dayName:"Saturday", type:"Light", focus:"Bridge · Kickback · Mobility", accent:"GLUTE CONTROL", lastDate:"New", sheetId:"1wdtWBjsO4jhfMMhQ7AO9O3RLbqcFjnOFtsMEAZFepZ4", sheetUrl:"https://docs.google.com/spreadsheets/d/1wdtWBjsO4jhfMMhQ7AO9O3RLbqcFjnOFtsMEAZFepZ4/edit", exercises:[
    {order:"A1",name:"Banded Dumbbell Glute Bridge",sets:3,reps:10,repRange:"8–12",load:0,unit:"lb",rest:60,cue:"Press your knees gently into the band and finish each rep with a strong glute squeeze."},
    {order:"B1",name:"Banded Kickbacks",sets:3,reps:10,repRange:"8–12",load:0,unit:"body",bodyLabel:"BAND",rest:45,cue:"Brace your trunk and extend from the hip without arching your lower back."},
    {order:"C1",name:"Bodyweight Curtsy Lunge",sets:3,reps:10,repRange:"8–12",load:0,unit:"body",bodyLabel:"BODYWEIGHT",rest:45,cue:"Step behind on a diagonal and keep the movement smooth and balanced."},
    {order:"D1",name:"Hip Airplanes",sets:3,reps:10,repRange:"8–12",load:0,unit:"body",bodyLabel:"BODYWEIGHT",rest:45,cue:"Move slowly from the hip and keep your standing knee softly bent."}
  ]}
];

export function ownerWorkoutFor(program:string|undefined,day:number|undefined){return ownerWorkouts.find(item=>item.program===program&&item.day===day)}
