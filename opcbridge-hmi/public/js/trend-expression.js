/* Bounded expression interpreter shared by rolling trend collection and preview. */
(function(root){
  'use strict';
  const connection='_trend_expression';
  function compile(source){
    source=String(source||'').trim();
    if(!source||source.length>4096)throw Error('Expression must contain 1–4096 characters.');
    const tokens=[];let at=0;
    const re=/\s*(?:(\d+(?:\.\d*)?|\.\d+)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|([A-Za-z_][A-Za-z_0-9]*)|(===|!==|==|!=|<=|>=|&&|\|\||\*\*|[()+\-*/%,!<>]))/y;
    while(at<source.length){re.lastIndex=at;const m=re.exec(source);if(!m)throw Error('Unsupported expression syntax.');tokens.push(m[1]!==undefined?{kind:'number',value:Number(m[1])}:m[2]?{kind:'string',value:decode(m[2])}:{kind:'symbol',value:m[3]||m[4]});at=re.lastIndex;}
    let i=0,depth=0;const dependencies=new Map(),functions={min:Math.min,max:Math.max,abs:Math.abs,round:Math.round,floor:Math.floor,ceil:Math.ceil};
    const precedence={'||':1,'&&':2,'==':3,'!=':3,'===':3,'!==':3,'<':4,'>':4,'<=':4,'>=':4,'+':5,'-':5,'*':6,'/':6,'%':6,'**':7};
    const peek=()=>tokens[i]?.value;
    const take=value=>{if(peek()!==value)throw Error(`Expected ${value}.`);i++;};
    function expression(min=0){
      if(++depth>64)throw Error('Expression nesting exceeds 64 levels.');
      let node;const token=tokens[i++];if(!token)throw Error('Incomplete expression.');
      if(token.kind==='number'||token.kind==='string')node={type:'literal',value:token.value};
      else if(['!','+','-'].includes(token.value))node={type:'unary',op:token.value,arg:expression(7)};
      else if(token.value==='('){node=expression();take(')');}
      else if(['true','false','null'].includes(token.value))node={type:'literal',value:token.value==='null'?null:token.value==='true'};
      else if(token.value==='tag'){
        take('(');const c=tokens[i++];take(',');const t=tokens[i++];take(')');
        if(c?.kind!=='string'||t?.kind!=='string'||!c.value||!t.value)throw Error('tag() requires a connection and tag in quotes.');
        node={type:'tag',connection_id:c.value,tag:t.value};dependencies.set(JSON.stringify([c.value,t.value]),node);
      }else if(token.value==='quality'){
        take('(');const arg=expression();let second;
        if(peek()===','){i++;second=expression();}take(')');
        if(second&&arg.type==='literal'&&second.type==='literal'&&typeof arg.value==='string'&&typeof second.value==='string'&&arg.value&&second.value){
          node={type:'quality',arg:{type:'tag',connection_id:arg.value,tag:second.value}};
          dependencies.set(JSON.stringify([arg.value,second.value]),node.arg);
        }else if(arg.type==='tag')node={type:'quality',arg};else throw Error('quality() requires a tag reference.');
      }else if(Object.hasOwn(functions,token.value)){
        take('(');const args=[];if(peek()!==')'){do{if(args.length)i++;args.push(expression());}while(peek()===',');}take(')');
        if(!args.length)throw Error('Function needs an argument.');node={type:'call',name:token.value,args};
      }else throw Error(`Unsupported token: ${token.value}`);
      while(Object.hasOwn(precedence,peek())&&precedence[peek()]>=min){const op=peek();i++;node={type:'binary',op,left:node,right:expression(precedence[op]+(op==='**'?0:1))};}
      depth--;return node;
    }
    const tree=expression();if(i!==tokens.length)throw Error('Unexpected expression token.');
    function run(n,read,quality){
      if(n.type==='literal')return n.value;
      if(n.type==='tag')return read(n.connection_id,n.tag);
      if(n.type==='quality')return quality(n.arg.connection_id,n.arg.tag);
      if(n.type==='call')return functions[n.name](...n.args.map(a=>run(a,read,quality)));
      const a=run(n.type==='unary'?n.arg:n.left,read,quality);
      if(n.type==='unary')return n.op==='!'?!a:n.op==='-'?-a:+a;
      if(n.op==='&&')return a&&run(n.right,read,quality);if(n.op==='||')return a||run(n.right,read,quality);
      const b=run(n.right,read,quality);
      switch(n.op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case '%':return a%b;case '**':return a**b;case '<':return a<b;case '>':return a>b;case '<=':return a<=b;case '>=':return a>=b;case '==':return a==b;case '!=':return a!=b;case '===':return a===b;case '!==':return a!==b;}
    }
    return {dependencies:[...dependencies.values()].map(({connection_id,tag})=>({connection_id,tag})),evaluate:(read,quality=()=> 'UNKNOWN')=>{const value=run(tree,read,quality);if(typeof value!=='number'&&typeof value!=='boolean'||!Number.isFinite(Number(value)))throw Error('Expression result is not a finite number.');return Number(value);}};
  }
  function decode(text){if(text[0]==='"')return JSON.parse(text);return text.slice(1,-1).replace(/\\(['"\\nrt])/g,(_,c)=>({n:'\n',r:'\r',t:'\t'}[c]||c));}
  const api={compile,connection};if(typeof module==='object')module.exports=api;else root.TrendExpression=api;
})(typeof window==='object'?window:globalThis);
