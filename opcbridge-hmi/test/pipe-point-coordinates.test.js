const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(`${__dirname}/../public/js/hmi.js`, 'utf8');
test('pipe coordinate edits preserve other points, allow decimals, and track the selected vertex', () => {
  const doc = { createElement(tag) { return {tag, children:[], handlers:{}, value:'', classes:new Set(),
    appendChild(child){this.children.push(child);}, replaceChildren(){this.children=[];},
    setAttribute(key,value){this[key]=value;}, addEventListener(key,fn){this.handlers[key]=fn;},
    get firstElementChild(){return this.children[0];},
    querySelectorAll(){return this.children.flatMap(child=>child.tag==='input'?[child]:child.querySelectorAll());},
    classList:{toggle(){}} }; } };
  const host=doc.createElement('div');doc.getElementById=()=>host;
  const obj={type:'pipe',points:[{x:10.25,y:20},{x:11.5,y:80},{x:90,y:80}]};
  let updates=0;
  const ctx=vm.createContext({document:doc, selectedIndices:[0], groupEditStack:[],selectedPolygonVertex:null,
    getActiveObjects:()=>[obj], updatePolylineProperty:patch=>{updates++;Object.assign(obj,patch);},
    updateSelectionOverlays:()=>vm.runInContext('syncPipePointCoordinates()',ctx)});
  const start=source.indexOf('const syncPipePointCoordinates =');
  vm.runInContext(source.slice(start,source.indexOf('const updatePointObjectPosition =',start)),ctx);
  vm.runInContext('syncPipePointCoordinates()',ctx);
  const input=host.children[1].querySelectorAll()[0];input.handlers.focus();
  assert.equal(ctx.selectedPolygonVertex.vertexIndex,1);
  input.value='10.25';input.handlers.change();assert.equal(obj.points[1].x,obj.points[0].x);
  assert.deepEqual(JSON.parse(JSON.stringify(obj.points[2])),{x:90,y:80});assert.equal(updates,1);
  input.value='';input.handlers.change();assert.equal(input.value,10.25);assert.equal(updates,1);
  const original=host.children[1];vm.runInContext('syncPipePointCoordinates()',ctx);
  assert.equal(host.children[1],original,'refresh preserves the active controls');
});
