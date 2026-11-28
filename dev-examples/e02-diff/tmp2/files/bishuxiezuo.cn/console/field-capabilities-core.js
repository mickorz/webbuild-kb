(function(){
  /* 数据形态协议：normalize 是唯一必需方法；clone、signature、equals、reviewCount
     可按形态覆盖。React 组件只按 kind 取协议，不感知资源 API。 */
  function jsonClone(value){
    if(value===undefined)return undefined;
    try{return JSON.parse(JSON.stringify(value));}catch(error){return value;}
  }

  function signature(value){
    try{return JSON.stringify(value);}catch(error){return String(value);}
  }

  function define(spec){
    if(!spec||typeof spec.normalize!=='function')throw new Error('Field protocol requires normalize(value)');
    const clone=typeof spec.clone==='function'?spec.clone:jsonClone;
    const valueSignature=typeof spec.signature==='function'?spec.signature:signature;
    return Object.freeze({
      normalize:spec.normalize,
      clone,
      signature:valueSignature,
      equals:typeof spec.equals==='function'?spec.equals:(left,right)=>valueSignature(left)===valueSignature(right),
      reviewCount:typeof spec.reviewCount==='function'?spec.reviewCount:()=>null
    });
  }

  const protocols=Object.create(null);

  function register(kind,spec){
    if(!kind)throw new Error('Field protocol requires a kind');
    if(protocols[kind])throw new Error('Field protocol already registered: '+kind);
    const protocol=define(spec);
    protocols[kind]=protocol;
    return protocol;
  }

  register('text',{normalize:value=>value==null?'':value});
  register('list',{
    normalize:value=>Array.isArray(value)?value:[],
    reviewCount:value=>Array.isArray(value)?value.length:0
  });
  register('structured',{
    normalize:value=>value&&typeof value==='object'?value:{},
    reviewCount:value=>Array.isArray(value)?value.length:null
  });

  function resolve(kind){
    const protocol=protocols[kind];
    if(!protocol)throw new Error('Unsupported field protocol: '+kind);
    return protocol;
  }

  function createReview(kind,before,after,version){
    const protocol=resolve(kind);
    const normalizedBefore=protocol.normalize(before);
    const normalizedAfter=protocol.normalize(after);
    return {
      kind,
      before:protocol.clone(normalizedBefore),
      after:protocol.clone(normalizedAfter),
      version,
      changed:!protocol.equals(normalizedBefore,normalizedAfter)
    };
  }

  window.LF_FIELD_PROTOCOL={define,register,resolve,createReview};
})();
