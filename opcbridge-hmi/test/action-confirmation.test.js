const test=require('node:test');
const assert=require('node:assert/strict');
const confirmation=require('../public/js/action-confirmation');
function documentFixture(){
 const doc={activeElement:{focus(){doc.restored=true;}}};
 doc.createElement=tag=>({tag,children:[],listeners:{},setAttribute(key,value){this[key]=value;},append(...nodes){this.children.push(...nodes);},appendChild(node){this.children.push(node);},addEventListener(key,fn){this.listeners[key]=fn;},showModal(){doc.dialog=this;},close(){this.closed=true;},remove(){this.removed=true;},focus(){doc.focused=this;}});
 doc.body=doc.createElement('body');return doc;
}
test('confirmation uses a safe default, Cancel/Escape resolve false, and Confirm resolves true',async()=>{
 const doc=documentFixture();let result=confirmation.request({requireConfirmation:true},doc);
 assert.equal(doc.dialog.children[1].textContent,'Are you sure?');
 assert.equal(doc.focused.textContent,'Cancel');assert.equal(await confirmation.request({requireConfirmation:true},doc),false,'do not stack confirmations');
 doc.dialog.children[2].children[0].listeners.click();assert.equal(await result,false);assert.equal(doc.restored,true);
 result=confirmation.request({requireConfirmation:true,confirmationMessage:'<b>Reset?</b>'},doc);
 assert.equal(doc.dialog.children[1].textContent,'<b>Reset?</b>','message is text, never markup');
 doc.dialog.children[2].children[1].listeners.click();assert.equal(await result,true);assert.equal(doc.dialog.removed,true);
 result=confirmation.request({requireConfirmation:true},doc);let prevented=false;
 doc.dialog.listeners.cancel({preventDefault(){prevented=true;}});assert.equal(await result,false);assert.equal(prevented,true);
 assert.equal(await confirmation.request({},doc),true);
});
