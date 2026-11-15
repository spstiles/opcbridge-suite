const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(`${__dirname}/../public/js/hmi.js`, 'utf8');
for (const objectType of ['pipe', 'polygon']) test(`${objectType} coordinate edits preserve other points, allow decimals, and track the selected vertex`, () => {
  const doc = { createElement(tag) { return {tag, children:[], handlers:{}, value:'', classes:new Set(),
    appendChild(child){this.children.push(child);}, replaceChildren(){this.children=[];},
    setAttribute(key,value){this[key]=value;}, addEventListener(key,fn){this.handlers[key]=fn;},
    get firstElementChild(){return this.children[0];},
    querySelectorAll(){return this.children.flatMap(child=>child.tag==='input'?[child]:child.querySelectorAll());},
    classList:{toggle(){},add(){}} }; } };
  const host=doc.createElement('div'),add=doc.createElement('button');doc.getElementById=id=>id===`${objectType}PointCoordinates`?host:id===`${objectType}PointCoordinatesAddBtn`?add:null;
  const obj={type:objectType,points:[{x:10.25,y:20},{x:11.5,y:80},{x:90,y:80}]};
  let updates=0;
  const ctx=vm.createContext({document:doc, selectedIndices:[0], groupEditStack:[],selectedPolygonVertex:null,
    getActiveObjects:()=>[obj], updatePolylineProperty:patch=>{updates++;Object.assign(obj,patch);},
    updatePolygonProperty:patch=>{updates++;Object.assign(obj,patch);},
    updateSelectionOverlays:()=>vm.runInContext('syncPathPointCoordinates()',ctx)});
  const start=source.indexOf('const syncPointCoordinateEditor =');
  vm.runInContext(source.slice(start,source.indexOf('const updatePointObjectPosition =',start)),ctx);
  vm.runInContext('syncPathPointCoordinates()',ctx);
  const input=host.children[1].querySelectorAll()[0];input.handlers.focus();
  assert.equal(ctx.selectedPolygonVertex.vertexIndex,1);
  input.value='10.25';input.handlers.change();assert.equal(obj.points[1].x,obj.points[0].x);
  assert.deepEqual(JSON.parse(JSON.stringify(obj.points[2])),{x:90,y:80});assert.equal(updates,1);
  input.value='';input.handlers.change();assert.equal(input.value,10.25);assert.equal(updates,1);
  const original=host.children[1];vm.runInContext('syncPathPointCoordinates()',ctx);
  assert.equal(host.children[1],original,'refresh preserves the active controls');
  if (objectType === 'pipe') {
    ctx.selectedPolygonVertex={groupDepth:0,objectIndex:0,vertexIndex:2};
    const remove=host.children[1].children.at(-1);
    assert.equal(remove['aria-label'],'Remove point 2');assert.equal(remove.disabled,false);
    remove.handlers.click();assert.equal(obj.points.length,2);assert.equal(ctx.selectedPolygonVertex.vertexIndex,1);
    assert.deepEqual(JSON.parse(JSON.stringify(obj.points)),[{x:10.25,y:20},{x:90,y:80}]);
    assert.equal(host.children[0].children.at(-1).disabled,true);
    host.children[0].children.at(-1).handlers.click();assert.equal(obj.points.length,2,'keep at least two points even if the handler is invoked directly');
    assert.equal(updates,2);
  }
  const before=JSON.stringify(obj.points),count=obj.points.length;
  add.onclick();assert.equal(obj.points.length,count+1);assert.equal(ctx.selectedPolygonVertex.vertexIndex,count);
  if(objectType==='polygon')assert.deepEqual(JSON.parse(JSON.stringify(obj.points.at(-1))),{x:50.125,y:50});
  else {
    const [a,b,c]=obj.points;assert.ok(Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x))<1e-8,'new pipe point follows the last section');
    assert.ok(Math.abs(Math.hypot(c.x-b.x,c.y-b.y)-40)<1e-8);
  }
  host.children.at(-1).children.at(-1).handlers.click();assert.equal(JSON.stringify(obj.points),before);
  assert.equal(ctx.selectedPolygonVertex.vertexIndex,count-1);
  assert.equal(host.children[0].children.at(-1).disabled,true);
  host.children[0].children.at(-1).handlers.click();assert.equal(obj.points.length,count,'respect the minimum point count for both object types');


});
