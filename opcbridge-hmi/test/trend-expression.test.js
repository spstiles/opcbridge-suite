const test=require('node:test'),assert=require('node:assert/strict');
const {compile}=require('../public/js/trend-expression');
test('trend expressions evaluate tag arithmetic and deduplicate input demand',()=>{
 const expression=compile('max(tag("PLC", "Flow") * 2, tag("PLC", "Flow") + 1) / 3');
 assert.deepEqual(expression.dependencies,[{connection_id:'PLC',tag:'Flow'}]);
 assert.equal(expression.evaluate(()=>4),8/3);
 assert.equal(compile('abs(-4) + round(2.2) + floor(3.8) + ceil(1.1)').evaluate(),11);
 assert.equal(compile('quality(tag("PLC", "Flow")) == "GOOD"').evaluate(()=>4,()=> 'GOOD'),1);
 assert.equal(compile("tag('PLC', 'Flow') > 2 && true").evaluate(()=>4),1);
});
test('expressions reject code execution, malformed syntax and nonnumeric results',()=>{
 for(const expression of ['process.exit()','tag.constructor("return process")()','(()=>1)()','tag("a", "b"); 1','tag("a")','1 +','"hello" + 2','1 / 0','('.repeat(70)+'1'+')'.repeat(70)]){
  assert.throws(()=>compile(expression).evaluate(()=>1),undefined,expression);
 }
 assert.throws(()=>compile('tag("PLC", "Missing")').evaluate(()=>{throw Error('missing');}),/missing/);
});
