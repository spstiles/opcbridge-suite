const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const source = require('node:fs').readFileSync(require.resolve('../public/js/hmi.js'), 'utf8');
const slice = (a,b) => source.slice(source.indexOf(a),source.indexOf(b));

test('cached edit permission cannot reopen the editor after server session loss', () => {
  const c = vm.createContext({authSession:{serverValid:false},isEditMode:false,hasPerm:()=>true});
  vm.runInContext(slice('const canEdit =','const loadAuthSession ='), c);
  assert.equal(vm.runInContext('canEdit()',c),false);
  c.isEditMode = true;
  assert.equal(vm.runInContext('canEdit()',c),true, 'preserve work in an already open editor');
  c.isEditMode = false;
  c.authSession.serverValid = true;
  assert.equal(vm.runInContext('canEdit()',c),true);
});

test('missing server status marks retained editor credentials invalid immediately', () => {
  const c = vm.createContext({
    authSession:{username:'editor',serverValid:true},authInfo:{},authServerLoggedOutSinceMs:0,
    isAuthTimeoutSuppressed:()=>true,saveAuthSession(){},markAuthActivity(){},
    recordAuthDiagnostic(){},authStatusSummary:()=>({}), AUTH_SERVER_LOGOUT_GRACE_MS:10000
  });
  vm.runInContext(slice('const syncLocalAuthFromStatus =','const isAuthTimeoutSuppressed ='),c);
  vm.runInContext('syncLocalAuthFromStatus({user_logged_in:false})',c);
  assert.equal(c.authSession.username,'editor');
  assert.equal(c.authSession.serverValid,false);
});

test('open editor keeps the server session alive even with a cached zero timeout', async () => {
  let touches = 0;
  const c = vm.createContext({
    authSession:{serverValid:true}, isEditMode:true, authEditExitGraceUntilMs:0,
    getAuthTimeoutMinutes:()=>0, isAuthSessionExpired:()=>false,
    authActivityLastMarkMs:0,authActivityLastTouchMs:0,authActivityTouchInFlight:false,
    authServerLoggedOutSinceMs:0,AUTH_SESSION_KEY:'test',sessionStorage:{setItem(){}},
    apiAuthTouch:async()=>{touches++;}, saveAuthSession(){},updateAuthUiVisibility(){}
  });
  vm.runInContext(slice('const isAuthTimeoutSuppressed =','const clearLocalAuthState ='),c);
  vm.runInContext('markAuthActivity({force:true})',c);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(touches,1);
  assert.equal(c.authActivityTouchInFlight,false);
});

test('all mode entry paths reject a known expired session', () => {
  const c = vm.createContext({modeTransitionRevision:0,isTouchRuntimeEndpoint:false,
    isEditMode:false,canEdit:()=>false,pendingEditModeAfterLogin:false,
    authStatusEl:{textContent:''}, openAuth(){c.loginOpened=true;}});
  const start=source.indexOf('const setMode = (next) => {');
  const end=source.indexOf('  if (!next && poseEditSession)',start);
  vm.runInContext(source.slice(start,end)+'\n};',c);
  vm.runInContext('setMode(true)',c);
  assert.equal(c.loginOpened,true);
  assert.equal(c.pendingEditModeAfterLogin,true);
  assert.equal(c.isEditMode,false);
});

test('auth heartbeat preserves credentials and can outlive page departure', async () => {
  let options;
  const c=vm.createContext({authFetchHeaders:base=>base,fetch:async(_,value)=>{
    options=value; return{ok:true,json:async()=>({ok:true})};
  }});
  vm.runInContext(slice('const apiAuthTouch =','const apiAuthAddUser ='),c);
  await vm.runInContext('apiAuthTouch()',c);
  assert.equal(options.keepalive,true);
  assert.equal(options.credentials,'same-origin');
});
