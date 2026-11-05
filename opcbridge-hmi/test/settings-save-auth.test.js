const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/js/hmi.js'),'utf8');
test('timeout save forwards the same administrator session header as status checks',async()=>{
 let request;
 const c=vm.createContext({fetch:async(url,options)=>{request={url,options};return{ok:true,json:async()=>({ok:true})};},authFetchHeaders:base=>({...base,'X-Admin-Token':'test-session'})});
 vm.runInContext(source.slice(source.indexOf('const apiAuthSaveTimeout ='),source.indexOf('const renderUsersList =')),c);
 await vm.runInContext('apiAuthSaveTimeout(10)',c);
 assert.equal(request.options.headers['X-Admin-Token'],'test-session');
 assert.equal(request.options.credentials,'same-origin');
});
function setup(timeout,fail=false){
 const calls=[];
 const c=vm.createContext({settingsStatus:{textContent:''},settingsScreenTimeoutInput:{value:String(timeout)},authInfo:{timeoutMinutes:10},authSession:null,
 readSettingsForm:()=>({opcbridge:{},alarms:{},hmi:{}}),apiSaveConfig:async()=>calls.push('config'),apiAuthSaveTimeout:async()=>{calls.push('timeout');if(fail)throw Error('HTTP 403');},
 opcbridgeConfig:{},alarmsConfig:{},hmiUiConfig:{},applySettingsToRuntime:async()=>calls.push('apply')});
 vm.runInContext(source.slice(source.indexOf('const saveSettings ='),source.indexOf('const testSettings =')),c);return{c,calls};
}
test('ordinary settings save and apply skips unchanged login timeout',async()=>{
 const{c,calls}=setup(10);await vm.runInContext('saveSettings(true)',c);
 assert.deepEqual(calls,['config','apply']);assert.equal(c.settingsStatus.textContent,'Applied.');
});
test('changed timeout saves and distinguishes authorization failure from config save',async()=>{
 const{c,calls}=setup(20,true);await vm.runInContext('saveSettings(false)',c);
 assert.deepEqual(calls,['config','timeout']);assert.match(c.settingsStatus.textContent,/Settings saved, but login timeout failed: HTTP 403/);
});
