const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const helper = fs.readFileSync(path.join(root, 'range.js'), 'utf8').replaceAll('export function ', 'function ');
const main = fs.readFileSync(path.join(root, 'fumble-switch.js'), 'utf8').replace(/^import .*\n/, '');
const hooks = {};
const values = {cheatStrategy:'range', cheatStateGm:'better', cheatStatePlayers:'off', cheatStatePlayerOverrides:{}, diceRanges:{d20:{min:7,max:9}}, affectedDice:{}, positiveDirection:'higher', positiveDirectionOverrides:{}, thresholdPercent:25, explicitMode:true, debugMode:true};
const writes = [], messages = [], errors = [], registered = {};
let random = 0;
class Die { constructor(faces, result, method) { this.faces=faces; this.value=result; this.method=method; } async roll() { return {result:this.value, active:true}; } }
class Roll { constructor(terms) { this.terms=terms; this.options={}; } async evaluate() { for (const term of this.terms) await term.roll(); return this; } }
class FormApplication {}
const math = Object.create(Math); math.random = () => random;
const context = {document:{createElement:()=>({dataset:{},firstElementChild:{},setAttribute(){},addEventListener(_name,fn){this.click=fn}})}, Math:math, Roll, foundry:{dice:{terms:{Die}},appv1:{api:{FormApplication}},utils:{mergeObject:Object.assign}}, game:{settings:{get:(_m,k)=>values[k],set:async (_m,k,v)=>{writes.push([k,v]); values[k]=v},register:(_m,k,v)=>registered[k]=v,registerMenu:()=>{}},user:{isGM:true,id:'gm'},users:{contents:[{isGM:true,active:true,id:'gm'}]},i18n:{localize:k=>k,format:k=>k}}, ui:{notifications:{error:e=>errors.push(e)}}, Hooks:{once:(name,fn)=>hooks[name]=fn,on:(name,fn)=>hooks[name]=fn}, ChatMessage:{create:m=>messages.push(m)}, console};
vm.createContext(context);
vm.runInContext(helper+'\n'+main+'\nthis.testApi={validateRange,getDieRange,sampleRange,FumbleSwitchSettingsMenu,onDsnRollStart,getStrategy,applyStrategy,createStrategyControl};',context);
const api=context.testApi;
function plain(v){return JSON.parse(JSON.stringify(v));}
(async()=>{
 hooks.init();
 assert.deepEqual(Object.keys(registered.cheatStrategy.choices),['full','bias','nudge','threshold']);
 assert.equal(registered.cheatStrategy.choices.nudge,'FUMBLE_SWITCH.settings.cheatStrategy.range');
 assert.deepEqual(plain(api.getDieRange({d20:{min:20,max:1}},'d20',20)),{min:1,max:20});
 for (const invalid of [['',2,20],[1,21,20],[2,1,20],[1.5,2,20]]) assert.equal(api.validateRange(...invalid),null);
 const counts = Array(3).fill(0); for(let i=0;i<300;i++) counts[api.sampleRange({min:7,max:9},()=> (i+0.5)/300)-7]++;
 assert.deepEqual(counts,[100,100,100]);
 for (const state of ['better','worse']) { values.cheatStateGm=state; for(const [r,expected] of [[0,7],[0.999,9]]) {random=r; const die=new Die(20,8); const roll=await new Roll([die]).evaluate(); assert.equal((await die.roll()).result,expected); assert.deepEqual(plain(roll.options),{}); assert.equal(die._fumbleSwitchCheated,undefined); assert.equal(die._fumbleSwitchDebug,undefined); hooks.createChatMessage({rolls:[roll]}); assert.equal(messages.length,0); api.onDsnRollStart(null,{roll}); assert.equal(roll.options.appearance,undefined); } }
 values.cheatStateGm='off'; random=0; assert.equal((await new Die(20,13).roll()).result,13);
 values.cheatStateGm='better'; values.affectedDice={d20:false}; assert.equal((await new Die(20,13).roll()).result,13); values.affectedDice={};
 assert.equal((await new Die(20,13,'pixels').roll()).result,13);
 values.cheatStrategy='nudge'; assert.equal(api.getStrategy(),'range'); assert.equal((await new Die(20,13).roll()).result,7); assert.equal(writes.length,0); const button=api.createStrategyControl(); assert.equal(button.dataset.strategy,'range'); await button.click(); assert.equal(values.cheatStrategy,'threshold'); assert.equal(writes.pop()[1],'threshold');
 values.cheatStrategy='bias'; await button.click(); assert.equal(values.cheatStrategy,'nudge'); assert.equal(button.dataset.strategy,'range'); writes.pop();
 const form = {}; for(const faces of [4,6,8,10,12,20,100]) { form[`range-min-d${faces}`]=1; form[`range-max-d${faces}`]=faces; form[`affected-d${faces}`]=true; }
 const menu=new api.FumbleSwitchSettingsMenu(); form['range-max-d100']=101; await menu._updateObject(null,form); assert.equal(writes.length,0); assert.equal(errors.length,1);
 form['range-max-d100']=100; await menu._updateObject(null,form); assert.deepEqual(writes.map(x=>x[0]),['diceRanges','affectedDice','positiveDirectionOverrides']);

 // A delayed message must not consume notification data from another roll.
 values.cheatStrategy='full'; await new Roll([new Die(20,4)]).evaluate();
 values.cheatStrategy='range'; const privateRoll=await new Roll([new Die(20,4)]).evaluate();
 values.cheatStrategy='full'; hooks.createChatMessage({rolls:[JSON.parse(JSON.stringify(privateRoll))]});
 assert.equal(messages.length,0); assert.deepEqual(plain(privateRoll.options),{});
 // The player's execution path also remains ordinary, with no range metadata.
 values.cheatStrategy='range'; context.game.user.isGM=false; values.cheatStatePlayers='worse';
 values.diceRanges={d20:{min:7,max:9}}; random=0.5;
 const playerRoll=await new Roll([new Die(20,1)]).evaluate();
 assert.deepEqual(plain(playerRoll.options),{}); assert.equal((await playerRoll.terms[0].roll()).result,8);
 hooks.createChatMessage({rolls:[playerRoll]}); assert.equal(messages.length,0); context.game.user.isGM=true;
 // Every face has the same-size sampling bucket for all supported die sizes.
 for(const faces of [4,6,8,10,12,20,100]) {
  const min=2,max=faces-1,counts=Array(max-min+1).fill(0);
  for(let i=0;i<counts.length*10;i++) counts[api.sampleRange({min,max},()=> (i+0.5)/(counts.length*10))-min]++;
  assert.ok(counts.every(n=>n===10));
  assert.equal(api.sampleRange({min:faces,max:faces},()=>0.99),faces);
 }
 values.cheatStrategy='full'; values.cheatStateGm='better'; const nonRange=await new Roll([new Die(20,5)]).evaluate(); assert.equal(nonRange.options.fumbleSwitchCheated,true); hooks.createChatMessage({rolls:[nonRange]}); assert.equal(messages.length,2); api.onDsnRollStart(null,{roll:nonRange}); assert.ok(nonRange.options.appearance);

 // A completed other-mode roll keeps its own behavior after switching to range.
 values.cheatStrategy='range'; const beforeDelayed=messages.length;
 hooks.createChatMessage({rolls:[nonRange]}); assert.equal(messages.length,beforeDelayed+2);
 api.onDsnRollStart(null,{roll:nonRange}); assert.ok(nonRange.options.appearance);
 // A cloned old roll must shed our metadata without altering the old message.
 const previousOptions=nonRange.options;
 const snapshot=JSON.stringify(previousOptions);
 values.cheatStrategy='range'; const cloned=new Roll([new Die(20,3)]); cloned.options=previousOptions;
 await cloned.evaluate(); assert.notEqual(cloned.options,previousOptions);
 assert.deepEqual(plain(cloned.options),{}); assert.equal(JSON.stringify(previousOptions),snapshot);
 values.cheatStrategy='full'; const messageCount=messages.length;
 hooks.createChatMessage({rolls:[JSON.parse(JSON.stringify(cloned))]});
 api.onDsnRollStart(null,{roll:cloned}); assert.equal(messages.length,messageCount); assert.equal(cloned.options.appearance,undefined);
 // Other modules' options/appearance survive range privacy cleanup.
 values.cheatStrategy='range'; const custom=new Roll([new Die(20,3)]);
 custom.options={fumbleSwitchCheated:true,fumbleSwitchDebug:[{originalResult:3}],appearance:{diceColor:'purple'},otherModule:{flag:1}};
 await custom.evaluate();assert.deepEqual(plain(custom.options),{appearance:{diceColor:'purple'},otherModule:{flag:1}});
 console.log('range integration checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
