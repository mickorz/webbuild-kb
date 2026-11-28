(function(){
  const MAX_LCS_CELLS=250000;
  const MISSING={};
  const IDENTITY_KEYS=['id','key','name','title','true_name'];

  function isObject(value){
    return value&&typeof value==='object'&&!Array.isArray(value);
  }

  function isLocalized(value){
    return isObject(value)&&('zh' in value||'en' in value)&&Object.keys(value).every(key=>key==='zh'||key==='en');
  }

  function same(left,right){
    if(left===right)return true;
    try{return JSON.stringify(left)===JSON.stringify(right);}catch(error){return false;}
  }

  function compact(ops){
    const result=[];
    ops.forEach(part=>{
      if(!part.value)return;
      const last=result[result.length-1];
      if(last&&last.type===part.type)last.value+=part.value;
      else result.push({type:part.type,value:part.value});
    });
    return result;
  }

  function tokenize(value){
    const text=String(value==null?'':value);
    if(!text)return [];
    if(typeof Intl!=='undefined'&&Intl.Segmenter){
      try{
        const segmenter=new Intl.Segmenter('zh',{granularity:'word'});
        return Array.from(segmenter.segment(text),part=>part.segment);
      }catch(error){}
    }
    return text.match(/[\p{Script=Han}]|[\p{L}\p{N}_]+|\s+|[^\s]/gu)||Array.from(text);
  }

  function coarseTextOps(before,after){
    let start=0;
    while(start<before.length&&start<after.length&&before[start]===after[start])start+=1;
    let oldEnd=before.length-1,newEnd=after.length-1;
    while(oldEnd>=start&&newEnd>=start&&before[oldEnd]===after[newEnd]){oldEnd-=1;newEnd-=1;}
    const ops=[];
    if(start)ops.push({type:'equal',value:before.slice(0,start).join('')});
    if(oldEnd>=start)ops.push({type:'remove',value:before.slice(start,oldEnd+1).join('')});
    if(newEnd>=start)ops.push({type:'add',value:after.slice(start,newEnd+1).join('')});
    if(oldEnd+1<before.length)ops.push({type:'equal',value:before.slice(oldEnd+1).join('')});
    return compact(ops);
  }

  function textOps(beforeValue,afterValue){
    const before=tokenize(beforeValue),after=tokenize(afterValue);
    if(!before.length)return after.length?[{type:'add',value:after.join('')}]:[];
    if(!after.length)return [{type:'remove',value:before.join('')}];
    if(before.length*after.length>MAX_LCS_CELLS)return coarseTextOps(before,after);
    const rows=Array.from({length:before.length+1},()=>new Uint32Array(after.length+1));
    for(let left=before.length-1;left>=0;left-=1){
      const row=rows[left],next=rows[left+1];
      for(let right=after.length-1;right>=0;right-=1){
        row[right]=before[left]===after[right]?next[right+1]+1:Math.max(next[right],row[right+1]);
      }
    }
    const ops=[];
    let left=0,right=0;
    while(left<before.length&&right<after.length){
      if(before[left]===after[right]){
        ops.push({type:'equal',value:before[left]});left+=1;right+=1;
      }else if(rows[left+1][right]>=rows[left][right+1]){
        ops.push({type:'remove',value:before[left]});left+=1;
      }else{
        ops.push({type:'add',value:after[right]});right+=1;
      }
    }
    while(left<before.length){ops.push({type:'remove',value:before[left]});left+=1;}
    while(right<after.length){ops.push({type:'add',value:after[right]});right+=1;}
    return compact(ops);
  }

  function positionalListOps(before,after){
    const rows=[];
    const count=Math.max(before.length,after.length);
    for(let index=0;index<count;index+=1){
      if(index>=before.length)rows.push({kind:'add',after:after[index],afterIndex:index});
      else if(index>=after.length)rows.push({kind:'remove',before:before[index],beforeIndex:index});
      else if(same(before[index],after[index]))rows.push({kind:'equal',before:before[index],after:after[index],beforeIndex:index,afterIndex:index});
      else rows.push({kind:'change',before:before[index],after:after[index],beforeIndex:index,afterIndex:index});
    }
    return rows;
  }

  function listOps(beforeValue,afterValue){
    const before=Array.isArray(beforeValue)?beforeValue:[];
    const after=Array.isArray(afterValue)?afterValue:[];
    if(before.length*after.length>MAX_LCS_CELLS)return positionalListOps(before,after);
    const rows=Array.from({length:before.length+1},()=>new Uint32Array(after.length+1));
    for(let left=before.length-1;left>=0;left-=1){
      const row=rows[left],next=rows[left+1];
      for(let right=after.length-1;right>=0;right-=1){
        row[right]=same(before[left],after[right])?next[right+1]+1:Math.max(next[right],row[right+1]);
      }
    }
    const raw=[];
    let left=0,right=0;
    while(left<before.length&&right<after.length){
      if(same(before[left],after[right])){
        raw.push({kind:'equal',before:before[left],after:after[right],beforeIndex:left,afterIndex:right});left+=1;right+=1;
      }else if(rows[left+1][right]>=rows[left][right+1]){
        raw.push({kind:'remove',before:before[left],beforeIndex:left});left+=1;
      }else{
        raw.push({kind:'add',after:after[right],afterIndex:right});right+=1;
      }
    }
    while(left<before.length){raw.push({kind:'remove',before:before[left],beforeIndex:left});left+=1;}
    while(right<after.length){raw.push({kind:'add',after:after[right],afterIndex:right});right+=1;}
    const result=[];
    for(let index=0;index<raw.length;){
      if(raw[index].kind==='equal'){result.push(raw[index]);index+=1;continue;}
      const removed=[],added=[];
      while(index<raw.length&&raw[index].kind!=='equal'){
        if(raw[index].kind==='remove')removed.push(raw[index]);
        else added.push(raw[index]);
        index+=1;
      }
      const paired=Math.min(removed.length,added.length);
      for(let pair=0;pair<paired;pair+=1)result.push({kind:'change',before:removed[pair].before,after:added[pair].after,beforeIndex:removed[pair].beforeIndex,afterIndex:added[pair].afterIndex});
      result.push(...removed.slice(paired),...added.slice(paired));
    }
    return result;
  }

  function cardIdentity(card){
    if(!isObject(card))return '';
    return identityValue(card.t||card.title||card.name||card.key||card.id);
  }

  function uniqueCardIds(items){
    const ids=items.map(cardIdentity);
    if(ids.some(id=>!id))return null;
    return new Set(ids).size===ids.length?ids:null;
  }

  function cardOps(beforeValue,afterValue){
    const before=Array.isArray(beforeValue)?beforeValue:[];
    const after=Array.isArray(afterValue)?afterValue:[];
    const beforeIds=uniqueCardIds(before),afterIds=uniqueCardIds(after);
    if(!beforeIds||!afterIds)return positionalListOps(before,after);
    const afterMap=new Map(afterIds.map((id,index)=>[id,index]));
    const matched=new Set();
    const result=[];
    before.forEach((card,beforeIndex)=>{
      const afterIndex=afterMap.get(beforeIds[beforeIndex]);
      if(afterIndex==null){
        result.push({kind:'remove',before:card,beforeIndex});
        return;
      }
      matched.add(afterIndex);
      result.push({
        kind:same(card,after[afterIndex])?'equal':'change',
        before:card,
        after:after[afterIndex],
        beforeIndex,
        afterIndex
      });
    });
    after.forEach((card,afterIndex)=>{
      if(!matched.has(afterIndex))result.push({kind:'add',after:card,afterIndex});
    });
    return result;
  }

  function identityValue(value){
    if(isLocalized(value))return String(value.zh||value.en||'').trim();
    if(['string','number'].includes(typeof value))return String(value).trim();
    return '';
  }

  function itemIdentity(item){
    if(!isObject(item))return null;
    for(const key of IDENTITY_KEYS){
      const label=identityValue(item[key]);
      if(label)return {key:key+':'+label,label};
    }
    return null;
  }

  function identityRows(items){
    const rows=items.map(itemIdentity);
    if(rows.some(item=>!item))return null;
    const keys=new Set(rows.map(item=>item.key));
    return keys.size===rows.length?rows:null;
  }

  function itemPart(label,index){
    return {kind:'item',label:label||'第 '+(index+1)+' 项'};
  }

  function push(entries,kind,path,before,after){
    entries.push({kind,path,before:before===MISSING?undefined:before,after:after===MISSING?undefined:after});
  }

  function collectArray(before,after,path,entries){
    const beforeIds=identityRows(before),afterIds=identityRows(after);
    if(beforeIds&&afterIds){
      const afterMap=new Map(afterIds.map((item,index)=>[item.key,index]));
      const matched=new Set();
      beforeIds.forEach((item,index)=>{
        const afterIndex=afterMap.get(item.key);
        if(afterIndex==null){
          push(entries,'remove',path.concat(itemPart(item.label,index)),before[index],MISSING);
          return;
        }
        matched.add(afterIndex);
        collect(before[index],after[afterIndex],path.concat(itemPart(afterIds[afterIndex].label,afterIndex)),entries);
      });
      afterIds.forEach((item,index)=>{
        if(!matched.has(index))push(entries,'add',path.concat(itemPart(item.label,index)),MISSING,after[index]);
      });
      return;
    }
    const count=Math.max(before.length,after.length);
    for(let index=0;index<count;index+=1){
      const nextPath=path.concat(itemPart('',index));
      if(index>=before.length)push(entries,'add',nextPath,MISSING,after[index]);
      else if(index>=after.length)push(entries,'remove',nextPath,before[index],MISSING);
      else collect(before[index],after[index],nextPath,entries);
    }
  }

  function collect(before,after,path,entries){
    if(before!==MISSING&&after!==MISSING&&same(before,after))return;
    if(before===MISSING){push(entries,'add',path,before,after);return;}
    if(after===MISSING){push(entries,'remove',path,before,after);return;}
    if(Array.isArray(before)&&Array.isArray(after)){collectArray(before,after,path,entries);return;}
    if(isObject(before)&&isObject(after)&&!isLocalized(before)&&!isLocalized(after)){
      const keys=Array.from(new Set(Object.keys(before).concat(Object.keys(after))));
      keys.forEach(key=>collect(key in before?before[key]:MISSING,key in after?after[key]:MISSING,path.concat(key),entries));
      return;
    }
    push(entries,'change',path,before,after);
  }

  function build(before,after){
    const entries=[];
    collect(before,after,[],entries);
    const summary={change:0,add:0,remove:0};
    entries.forEach(entry=>{summary[entry.kind]+=1;});
    return {entries,summary};
  }

  window.LF_REWRITE_DIFF_CORE={build,textOps,listOps,cardOps};
})();
