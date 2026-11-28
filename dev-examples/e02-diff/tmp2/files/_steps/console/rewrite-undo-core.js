(function(){
  const PREFIX='lf_rewrite_undo_v1:';

  function same(left,right){
    if(left===right)return true;
    try{return JSON.stringify(left)===JSON.stringify(right);}catch(error){return false;}
  }

  function key(bookId,identity,path){
    if(!bookId||!identity||!identity.resource_type||!identity.resource_key)return '';
    const parts=[bookId,identity.resource_type,identity.resource_key,(Array.isArray(path)?path:[]).join('.')];
    return PREFIX+parts.map(part=>encodeURIComponent(String(part))).join(':');
  }

  function remove(storage,storageKey){
    if(!storage||!storageKey)return;
    try{storage.removeItem(storageKey);}catch(error){}
  }

  function read(storage,storageKey){
    if(!storage||!storageKey)return null;
    try{
      const value=JSON.parse(storage.getItem(storageKey)||'null');
      if(!value||value.schema!==1||!Object.prototype.hasOwnProperty.call(value,'before')||
        !Object.prototype.hasOwnProperty.call(value,'after')||value.version==null){
        remove(storage,storageKey);
        return null;
      }
      return value;
    }catch(error){
      remove(storage,storageKey);
      return null;
    }
  }

  function write(storage,storageKey,review){
    if(!storage||!storageKey||!review||review.version==null)return false;
    try{
      storage.setItem(storageKey,JSON.stringify({
        schema:1,
        before:review.before,
        after:review.after,
        version:review.version,
        created_at:Date.now()
      }));
      return true;
    }catch(error){return false;}
  }

  function matches(review,currentValue,currentVersion){
    return !!review&&review.version!=null&&currentVersion!=null&&
      Number(review.version)===Number(currentVersion)&&same(review.after,currentValue);
  }

  window.LF_REWRITE_UNDO={key,read,write,remove,matches};
})();
