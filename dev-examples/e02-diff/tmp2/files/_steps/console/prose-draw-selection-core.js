/* Anonymous reader policy. No model roles, generated ordinals or synthetic success. */
(function(root){
  'use strict';
  function rows(round){
    var order=round&&round.display_order, candidates=round&&round.candidates;
    if(!Array.isArray(order)||order.length!==2||new Set(order).size!==2||!Array.isArray(candidates)||candidates.length!==2)return [];
    if(new Set(candidates.map(function(c){return c.candidate_id;})).size!==2)return [];
    return order.map(function(id,index){
      var candidate=candidates.find(function(c){return c.candidate_id===id;});
      if(!candidate)return null;
      return {id:id,letter:index?'B':'A',status:candidate.status,body:typeof candidate.body==='string'?candidate.body:'',selected:round.selected_candidate_id===id,
        creditsRefunded:candidate.status==='failed'&&candidate.credits_refunded===true
          &&!round.cancel_state?.requested&&!round.current_adoption_id
          &&['awaiting_selection','failed','preparation_failed'].includes(round.status)};
    }).filter(Boolean);
  }
  function policy(round){
    var list=rows(round), request=round&&round.adoption_request;
    var active=!!(request&&['queued','running'].includes(request.status))||!!(round&&round.current_adoption_id&&!['adopted','ready','post_process_failed','cancelled','rejected'].includes(round.status));
    var terminal=list.length===2&&list.every(function(c){return ['completed','failed','cancelled'].includes(c.status);});
    var known=!!round&&['awaiting_selection','adopted','ready','post_process_failed'].includes(round.status);
    var available=known&&terminal&&!active;
    return {rows:list,busy:active,canAdopt:available&&Number.isInteger(round.current_body_version),
      canReject:available&&!round.current_adoption_id&&list.every(function(c){return c.status==='completed'&&c.body.trim();}),
      modified:!!round&&round.body_modified_since_adoption===true};
  }
  function label(round,en){
    if(!round)return en?'Loading':'正在读取';
    if(policy(round).busy)return en?'Adopting':'采用中';
    if(round.status==='ready'&&round.body_modified_since_adoption===true)return en?'Adopted; prose edited':'已采用，正文已修改';
    var labels={ready:en?'Adopted':'已采用',adopted:en?'Adopted':'已采用',post_process_failed:en?'Adopted; finalization incomplete':'已采用，后验未完成',rejected:en?'Neither chosen':'两篇都不满意',cancelled:en?'Stopped':'已结束',preparation_failed:en?'Preparation failed':'准备失败',failed:en?'Failed and ended':'失败，已结束'};
    if(labels[round.status])return labels[round.status];
    var list=rows(round);
    if(list.length===2&&list.every(function(c){return c.status==='completed'&&c.body.trim();}))return en?'Choose a draft':'候选待选择';
    if(list.length===2&&list.every(function(c){return ['completed','failed','cancelled'].includes(c.status);}))return en?'View results':'查看生成结果';
    return en?'Generating':'生成中';
  }
  function path(book,round){return '/api/books/'+encodeURIComponent(book)+'/chapter-rounds'+(round?'/'+encodeURIComponent(round):'');}
  function key(){return 'draw-'+root.crypto.randomUUID();}
  var api={rows:rows,policy:policy,label:label,path:path,key:key};
  root.ProseDrawSelectionCore=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
