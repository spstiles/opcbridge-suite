const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../public/js/hmi.js'),'utf8');
function setup(){
 const picked=[];
 const element=type=>({tagName:type,children:[],events:{},append(...nodes){this.children.push(...nodes);},appendChild(node){this.children.push(node);},addEventListener(name,fn){this.events[name]=fn;}});
 const rows=element('div');
 const c=vm.createContext({document:{createElement:element},textBindingRows:rows,
  setConnectionSelectValue:(select,id,tag)=>{picked.push({id,tag});select.value=id;},
  formatAutomationExpressionForDisplay:e=>e.replaceAll("connection_abc123", "Field Ops"),
  getTextBindingsMap:obj=>obj.textBindings||{},connectionIdFromFriendlyInput:el=>el.value,
  updateTextBindingProperty:()=>{},updateButtonLabelBindingProperty:()=>{},openTextBindingModal:()=>{}});
 vm.runInContext(source.slice(source.indexOf('const TEXT_PLACEHOLDER_RE ='),source.indexOf('const normalizeTextBinding =')),c);
 vm.runInContext(source.slice(source.indexOf('const createInlineTextBindingRow ='),source.indexOf('const renderBoundTemplate =')),c);
 vm.runInContext(source.slice(source.indexOf('const renderTextBindingRows ='),source.indexOf('const renderButtonLabelBindingRows =')),c);
 return {c,rows,picked};
}
test('a new {stage} placeholder renders its connection and tag controls before a binding exists',()=>{
 const {c,rows,picked}=setup();
 vm.runInContext('renderTextBindingRows({type:"text",text:"{stage}"})',c);
 assert.equal(rows.children.length,1);
 const controls=rows.children[0].children;
 assert.equal(controls[0].textContent,'{stage}');
 assert.equal(controls[1].tagName,'select');
 assert.equal(controls[2].tagName,'input');assert.equal(controls[2].value,'');
 assert.equal(controls[3].tagName,'button');assert.equal(picked[0].id,'');
});
test('button labels tolerate an explicitly null binding',()=>{
 const {c}=setup();
 const row=vm.runInContext('createInlineTextBindingRow({key:"stage",binding:null,objectType:"button"})',c);
 assert.equal(row.children[1].tagName,'select');
});
test('existing placeholder bindings retain their connection and tag',()=>{
 const {c,rows,picked}=setup();
 vm.runInContext('renderTextBindingRows({text:"{stage}",textBindings:{stage:{connection_id:"Kraft",tag:"State"}}})',c);
 assert.deepEqual(picked,[{id:'Kraft',tag:'State'}]);
 assert.equal(rows.children[0].children[2].value,'State');
});

test('inline expression previews and tooltips display friendly names without modifying stored bindings',()=>{
 const {c}=setup();
 c.binding={sourceType:'expression',expression:'tag("connection_abc123", "Flow") / 694.4'};
 const row=vm.runInContext('createInlineTextBindingRow({key:"flow",binding,objectType:"button"})',c);
 assert.equal(row.children[2].value,'tag("Field Ops", "Flow") / 694.4');
 assert.equal(row.children[2].title,row.children[2].value);
 assert.equal(row.children[2].readOnly,true);
 assert.equal(c.binding.expression,'tag("connection_abc123", "Flow") / 694.4');
});
