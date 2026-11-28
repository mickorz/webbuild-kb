/* User draw transport policy. Stored records contain command identity, never prose or guidance. */
(function(root){
  'use strict';
  const path=(book,round)=>'/api/books/'+encodeURIComponent(book)+'/chapter-rounds'+(round?'/'+encodeURIComponent(round):'');
  const settingsPath=book=>'/api/books/'+encodeURIComponent(book)+'/prose-draw-settings';
  const storageKey=(account,book)=>'lf_draw_run:v1:'+encodeURIComponent(account)+':'+encodeURIComponent(book);
  const roundId=()=>root.crypto.randomUUID();
  const key=()=> 'draw-'+roundId();
  function input(target,guidance){
    return {chapter_number:Number(target&&target.chapterNumber),human_intent:String(guidance||'').trim(),
      world_intent:String(target&&target.worldIntent||''),target_word_count:target&&target.targetWordCount?String(target.targetWordCount):null,
      language:String(target&&target.language||'中文')};
  }
  const inputKey=(account,target)=>JSON.stringify([String(account||''),String(target&&target.bookId||''),
    target&&target.chapterNumber,target&&target.requestId||'',target&&target.mode||'',target&&target.executionMode||'character_state']);
  async function inputHash(value){
    const canonical=JSON.stringify(Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])));
    const digest=await root.crypto.subtle.digest('SHA-256',new root.TextEncoder().encode(canonical));
    return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  }
  function quote(value){
    if(!value||!Number.isSafeInteger(value.total_credits_millis)||value.total_credits_millis<0)return null;
    if(typeof value.quote_token==='string'&&value.quote_token&&value.quote_token.length<=8192)
      return {quote_token:value.quote_token,total_credits_millis:value.total_credits_millis,expires_at:value.expires_at||null};
    // Existing unknown creates may still restore the earlier two-token command.
    if(typeof value.round_id!=='string'||!value.round_id||!Array.isArray(value.quote_tokens)
      ||value.quote_tokens.length!==2||new Set(value.quote_tokens).size!==2
      ||value.quote_tokens.some(token=>typeof token!=='string'||!token||token.length>8192))return null;
    return {round_id:value.round_id,quote_tokens:value.quote_tokens.slice(),total_credits_millis:value.total_credits_millis};
  }
  const createPayload=command=>command.quote_token
    ?{quote_token:command.quote_token,round_id:command.round_id,input_hash:command.input_hash,...(command.input?{input:command.input}:{})}
    :{quote_tokens:command.quote_tokens};
  const validSettings=value=>!!value&&typeof value.enabled==='boolean'&&typeof value.globally_enabled==='boolean';
  const validRound=(value,id,no)=>!!value&&value.round_id===id&&Number(value.chapter_number)===Number(no)&&typeof value.status==='string';
  function stageState(round){
    const prep=round&&round.preparation||{}, mode=prep.execution_mode;
    // The path is frozen with this round; never use the user's current toggle
    // or the previous ordinary generation's stage to invent completed steps.
    if(!['full','writer_group','character_state'].includes(mode))return {stage:null,stageOptions:null};
    const candidates=Array.isArray(round.candidates)?round.candidates:[];
    const composing=candidates.some(row=>row.current_stage==='candidate_prose'||row.current_stage==='compose'
      ||row.status==='completed'&&typeof row.body==='string'&&row.body.trim());
    return {stage:composing?'compose':prep.current_stage||null,
      stageOptions:{task_type:'chapter_draft',execution_mode:mode,writer_type:'single',chapter_number:round.chapter_number,prose_draw:true}};
  }
  function closed(round){return !!(round&&(round.current_adoption_id||['adopted','post_processing','ready','post_process_failed','rejected','failed'].includes(round.status)));}
  function pendingSelection(round){return !!(round&&round.status==='awaiting_selection'&&!closed(round)
    &&Array.isArray(round.candidates)&&round.candidates.some(row=>row.status==='completed'&&typeof row.body==='string'&&row.body.trim()));}
  function needsRead(record){
    if(!record||!record.draw)return false;
    const draw=record.draw,round=draw.round||{};
    if(draw.creationState||draw.readState==='failed')return true;
    if(closed(round))return false;
    if(draw.cancelState||round.status==='cancelled')return draw.stopConfirmed!==true;
    if(round.status==='preparation_failed')return false;
    if(round.status==='awaiting_selection')return !Array.isArray(round.candidates)||round.candidates.length!==2
      ||round.candidates.some(row=>!['completed','failed','cancelled'].includes(row.status)||row.status==='completed'&&!(typeof row.body==='string'&&row.body.trim()));
    return true;
  }
  function awaitingFailureClose(round){
    return !!(round&&(round.status==='preparation_failed'||round.status==='awaiting_selection'
      &&round.candidates?.length===2&&round.candidates.every(row=>['failed','cancelled'].includes(row.status))));
  }
  function saved(record,account){
    if(!record||!record.draw||!record.draw.round)return null;
    const command=record.draw.createCommand;
    return {accountId:String(account),bookId:String(record.bookId),chapterNumber:Number(record.chapterNumber),
      roundId:record.draw.round.round_id,
      ...(command?{createKey:command.key,...(command.quote_token
        ?{quoteToken:command.quote_token,inputHash:command.input_hash}
        :{quoteTokens:command.quote_tokens.slice()})}:{}),
      ...(record.draw.cancelKey?{cancelKey:record.draw.cancelKey}:{}),
      cancelRequested:!!record.draw.cancelState};
  }
  function restore(value,account,book){
    if(!value||value.accountId!==String(account)||value.bookId!==String(book)||!Number.isInteger(value.chapterNumber)
      ||value.chapterNumber<1||typeof value.roundId!=='string'||!value.roundId||value.roundId.length>128)return null;
    const command=value.createKey&&quote({round_id:value.roundId,quote_token:value.quoteToken,quote_tokens:value.quoteTokens,total_credits_millis:0});
    if(value.createKey&&(!command||typeof value.createKey!=='string'||value.createKey.length>128
      ||command.quote_token&&!/^[0-9a-f]{64}$/.test(value.inputHash||'')))return null;
    return {operationId:'draw_'+value.roundId,accountId:String(account),bookId:String(book),chapterNumber:value.chapterNumber,status:'verifying',draw:{
      round:{round_id:value.roundId,chapter_number:value.chapterNumber,status:'unknown',candidates:[],display_order:[]},
      readState:'loading',creationState:command?'unknown':null,
      createCommand:command?{key:value.createKey,...(command.quote_token
        ?{quote_token:command.quote_token,round_id:value.roundId,input_hash:value.inputHash}
        :{quote_tokens:command.quote_tokens})}:null,
      cancelKey:typeof value.cancelKey==='string'&&value.cancelKey.length<=128?value.cancelKey:null,
      cancelState:value.cancelRequested?'unknown':null,stopConfirmed:false}};
  }
  const code=error=>error&&((error.detail&&error.detail.code)||(error.body&&error.body.detail&&error.body.detail.code)||error.code);
  const knownRejection=error=>{
    const status=Number(error&&error.status);
    // Only the create POST can prove rejection. A missing GET or an unclassified
    // conflict cannot rule out an admitted command whose acknowledgement was lost.
    if(!(status>=400&&status<500)||status===408||code(error)==='idempotency_in_progress')return false;
    if([400,401,402,403,404,405,410,413,414,415,422,429].includes(status))return true;
    return ['insufficient_credits','active_chapter_task','prose_draw_disabled','prose_draw_no_candidate',
    'prose_draw_quote_pair_required','prose_draw_quote_mismatch','prose_draw_quote_expired','prose_draw_quote_stale',
    'prose_draw_candidate_paused','prose_draw_evaluation_paused','prose_draw_baseline_changed','prose_draw_resource_mismatch',
    'prose_draw_price_missing','prose_draw_budget_unavailable','prose_draw_price_unavailable','prose_draw_free_price_missing','prose_draw_create_mismatch','prose_draw_input_required','prose_draw_input_mismatch'].includes(code(error));
  };
  function errorText(error,en){
    const messages={
      prose_draw_input_required:['请重新确认本章指导后生成。','Confirm the chapter guidance again before generating.'],
      prose_draw_input_mismatch:['生成输入未能确认，请重新打开生成窗口。','The generation input could not be confirmed. Open the dialog again.'],
      insufficient_credits:['笔力不足，请补充笔力后重新确认。','Insufficient credits. Add credits and confirm again.'],
      active_chapter_task:['作品已有章节任务，请等待完成后重新确认。','A chapter task is active. Wait for it to finish, then confirm again.'],
      prose_draw_disabled:['正文抽卡当前不可用，请重新读取作品设置。','Prose draw is unavailable. Refresh the book settings.'],
      prose_draw_no_candidate:['暂时没有可用的抽卡方案，请稍后重试。','No draw configuration is available. Try again later.'],
      prose_draw_quote_expired:['本次报价已过期，请重新获取报价后确认。','This quote expired. Get a new quote and confirm again.'],
      prose_draw_quote_stale:['设定或价格已变化，请按新报价重新确认。','Book settings or prices changed. Confirm the updated quote.'],
      prose_draw_candidate_paused:['本次生成方案已暂停，请重新获取报价。','This draw configuration was paused. Get a new quote.'],
      prose_draw_evaluation_paused:['本次抽卡任务已暂停，请重新获取报价。','This evaluation was paused. Get a new quote.'],
      prose_draw_baseline_changed:['本次生成方案已更新，请重新获取报价。','The draw configuration changed. Get a new quote.']};
    const message=messages[code(error)];
    if(message)return message[en?1:0];
    const status=Number(error&&error.status);
    if(status===401)return en?'Sign in again before generating.':'登录状态已失效，请重新登录后生成。';
    if(status===403)return en?'You do not have permission for this action.':'当前账号没有此操作权限。';
    if(status===429)return en?'Too many requests. Wait before confirming again.':'请求过于频繁，请稍后重新确认。';
    if(status===400||status===422)return en?'The generation input was rejected. Review it and confirm again.':'生成参数未被接受，请检查后重新确认。';
    return en?'Unable to confirm the draw quote. Refresh it and try again.':'暂时无法确认抽卡报价，请重新获取后再试。';
  }
  const api={path,settingsPath,storageKey,key,roundId,input,inputKey,inputHash,quote,createPayload,validSettings,validRound,stageState,closed,pendingSelection,needsRead,awaitingFailureClose,saved,restore,code,knownRejection,errorText};
  root.ProseDrawFlowCore=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
