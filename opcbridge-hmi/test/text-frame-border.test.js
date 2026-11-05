const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../public/js/hmi.js'),'utf8');
function setup(){
 const c=vm.createContext({document:{createElementNS:()=>({attrs:{},setAttribute(key,value){this.attrs[key]=String(value);}})},parseSolidColor:()=>({r:80,g:120,b:160,opacity:255})});
 vm.runInContext(source.slice(source.indexOf('const appendRaisedFramePaths ='),source.indexOf('const isTextBorderEnabled =')),c);
 return c;
}
test('text frame uses opposing outer and inner bevels in the requested band',()=>{
 const c=setup();
 for(const width of [2,3]){
  const paths=[];c.parent={appendChild:p=>paths.push(p)};
  vm.runInContext(`appendRaisedFramePaths(parent, 10, 20, 100, 40, ${width}, '#5078a0', 'rotate(10)')`,c);
  assert.equal(paths.length,8);
  assert.equal(paths[0].attrs.fill,paths[6].attrs.fill);
  assert.equal(paths[2].attrs.fill,paths[4].attrs.fill);
  assert.notEqual(paths[0].attrs.fill,paths[4].attrs.fill);
  assert.equal(paths[0].attrs.fill,'rgb(185,201,217)');
  assert.ok(paths.every(p=>p.attrs.transform==='rotate(10)'&&p.attrs['pointer-events']==='none'));
  const coords=paths.flatMap(p=>p.attrs.d.match(/-?\d+(?:\.\d+)?/g).map(Number));
  assert.ok(coords.every(Number.isFinite));
  assert.match(paths[4].attrs.d,new RegExp(`${10+width} ${20+width}`));
 }
 vm.runInContext('style = normalizeBorderStyle("frame"); styled = isStyledBorder(style)',c);
 assert.equal(c.style,'frame');assert.equal(c.styled,true);
});
test('zero-width and invalid frames draw nothing, tiny boxes remain bounded',()=>{
 const c=setup();const paths=[];c.parent={appendChild:p=>paths.push(p)};
 vm.runInContext("appendRaisedFramePaths(parent,0,0,100,40,0,'#5078a0'); appendRaisedFramePaths(parent,0,0,NaN,40,3,'#5078a0')",c);
 assert.equal(paths.length,0);
 vm.runInContext("appendRaisedFramePaths(parent,0,0,2,2,30,'#5078a0')",c);
 assert.ok(paths.flatMap(p=>p.attrs.d.match(/-?\d+(?:\.\d+)?/g).map(Number)).every(n=>n>=0&&n<=2));
});
