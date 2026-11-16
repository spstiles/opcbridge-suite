const test=require('node:test'),assert=require('node:assert/strict');
const flow=require('../public/js/pipe-flow');
test('flow trigger supports Boolean tags and expressions and is disabled when inactive',()=>{
 const env={read:()=>0,evaluate:()=>false};
 assert.equal(flow.active(flow.normalize({sourceType:'tag'}),env),false);
 assert.equal(flow.active(flow.normalize({sourceType:'tag'}),{...env,read:()=>true}),true);
 assert.equal(flow.active(flow.normalize({sourceType:'expression'}),{...env,evaluate:()=>1}),true);
 assert.equal(flow.active(flow.normalize({sourceType:'tag'}),{...env,read:()=>undefined}),false);
 assert.equal(flow.active(flow.normalize({enabled:false}),env),false);
});
test('pipe dashes follow the supplied geometry, stay within the body, and preserve redraw phase',()=>{
 const parent={children:[],appendChild(node){this.children.push(node);},ownerDocument:{createElementNS(){return {attrs:{},setAttribute(key,value){this.attrs[key]=value;},animate(frames,options){this.frames=frames;this.options=options;return this.animation={};}};}}};
 const obj={type:'pipe',flowAutomation:{speed:40,dash:12,gap:20,width:50,direction:'forward'}};
 const env={read:()=>true,evaluate:()=>true,now:()=>1250};
 const path=flow.append(parent,obj,'M 0 0 L 100 0 Q 120 0 120 20',20,2,env);
 assert.equal(path.attrs.d,'M 0 0 L 100 0 Q 120 0 120 20');assert.equal(path.attrs['stroke-width'],14);
 assert.equal(path.options.duration,800);assert.equal(path.animation.currentTime,450);assert.equal(path.frames[1].strokeDashoffset,-32);
 obj.flowAutomation.direction='reverse';const reverse=flow.append(parent,obj,path.attrs.d,20,2,env);assert.equal(reverse.frames[1].strokeDashoffset,32);assert.equal(reverse.animation.currentTime,450);
 assert.equal(flow.append(parent,{...obj,type:'rect'},'',20,2,env),null);
 obj.flowAutomation.enabled=false;assert.equal(flow.append(parent,obj,'',20,2,env),null);
});
test('automatic flow color follows the evaluated pipe color while custom color stays fixed',()=>{
 const parent={appendChild(){},ownerDocument:{createElementNS(){return {attrs:{},setAttribute(k,v){this.attrs[k]=v;}};}}};
 const obj={type:'pipe',color:'#204060',flowAutomation:{enabled:true}};
 const env={edit:true,pipeColor:'#204060'};
 const first=flow.append(parent,obj,'M 0 0 L 100 0',20,1,env);
 assert.equal(first.attrs.stroke,flow.lighterColor('#204060'));assert.notEqual(first.attrs.stroke,'#204060');
 const changed=flow.append(parent,obj,'M 0 0 L 100 0',20,1,{...env,pipeColor:'#802020'});assert.notEqual(changed.attrs.stroke,first.attrs.stroke);
 obj.flowAutomation={enabled:true,colorMode:'custom',color:'#123456'};
 assert.equal(flow.append(parent,obj,'M 0 0 L 100 0',20,1,env).attrs.stroke,'#123456');
 assert.equal(flow.lighterColor('#ffffff'),'#8c8c8c');
});
