/* Anonymous, read-only projection for the existing run overlay and task dock. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ProseDrawProgressCore=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  const object=value=>value&&typeof value==='object'?value:{};
  function project(input,language,targetChapter){
    const draw=object(input),received=object(draw.round),en=language==='en';
    const round=targetChapter!=null&&Number(received.chapter_number)!==Number(targetChapter)?{}:received;
    const text=(zh,english)=>en?english:zh;
    const autoClosed=round.status==='failed';
    const preparationFailed=round.status==='preparation_failed'||autoClosed&&round.preparation?.status==='failed';
    const candidates=Array.isArray(round.candidates)?round.candidates:[];
    const order=Array.isArray(round.display_order)?round.display_order:[];
    const ordered=order.length===2&&order.every(id=>typeof id==='string'&&id)&&new Set(order).size===2;
    const waiting=['queued','pending','preparing'].includes(round.status)||!candidates.length&&(round.status==='running'||preparationFailed);
    const rows=[0,1].map(index=>{
      const id=ordered?order[index]:null;
      const matches=id?candidates.filter(item=>item&&item.candidate_id===id):[];
      const candidate=matches.length===1?matches[0]:null;
      let status='unknown';
      if(candidate){
        if(candidate.status==='completed')status=typeof candidate.body==='string'&&candidate.body.trim()?'ready':'verifying';
        else status=({pending:'waiting',queued:'waiting',running:'active',failed:'failed',cancelled:'stopped'})[candidate.status]||'unknown';
      }else if(waiting&&!candidates.length&&!order.length)status='waiting';
      if(preparationFailed&&status==='waiting')status='not_started';
      return {letter:index===0?'A':'B',status,creditsRefunded:status==='failed'&&candidate?.credits_refunded===true};
    });
    const ready=rows.filter(row=>row.status==='ready').length;
    const terminal=rows.every(row=>['ready','failed','stopped'].includes(row.status));
    const cancelRequested=!!draw.cancelState||round.status==='cancelled';
    let kind='running';
    if(!round.round_id)kind='unknown';
    else if(draw.creationState==='unknown')kind='submission_unknown';
    else if(draw.creationState==='submitting')kind='submitting';
    else if(round.current_adoption_id||['adopted','post_processing','post_process_failed','ready','rejected'].includes(round.status))kind='closed';
    else if(autoClosed)kind='failed';
    else if(cancelRequested&&draw.stopConfirmed===true)kind='cancelled';
    else if(draw.cancelState==='unknown'||(cancelRequested&&draw.readState==='failed'))kind='cancel_unknown';
    else if(cancelRequested)kind='stopping';
    else if(draw.readState==='failed')kind='read_failed';
    else if(!['pending','queued','running','preparing','prepared','generating','awaiting_selection','preparation_failed','failed'].includes(round.status))kind='unknown';
    else if(round.status==='preparation_failed'||round.status==='failed')kind='failed';
    else if(draw.readState==='loading'||rows.some(row=>row.status==='verifying'))kind='verifying';
    else if(ready===2)kind='ready';
    else if(terminal)kind=ready?'partial':'failed';
    else if(rows.some(row=>row.status==='unknown'))kind='unknown';
    if(['stopping','cancelled','cancel_unknown'].includes(kind)){
      rows.forEach(row=>{
        if(['ready','failed','stopped'].includes(row.status))return;
        row.status=kind==='cancelled'?'stopped':kind==='cancel_unknown'?'unknown':'stopping';
      });
    }
    const refundVisible=['running','partial','failed'].includes(kind)&&!cancelRequested
      &&!draw.creationState&&!['failed','loading'].includes(draw.readState);
    rows.forEach(row=>{row.creditsRefunded=refundVisible&&row.creditsRefunded;});
    const creditsRefunded=kind==='failed'&&refundVisible&&round.credits_refunded===true;
    const rowWords={waiting:text('等待开始','Waiting'),not_started:text('未开始','Not started'),active:text('生成中','Generating'),ready:text('已生成','Generated'),verifying:text('正在读取','Loading'),failed:text('生成失败','Failed'),stopped:text('已停止','Stopped'),stopping:text('停止确认中','Awaiting stop'),unknown:text('状态待确认','Unknown')};
    rows.forEach(row=>{row.label=text('正文 ','Draft ')+row.letter;row.statusLabel=rowWords[row.status];});
    const titles={running:waiting?text('正在准备本章','Preparing the chapter'):text('单写手落笔成文','Single writer composing the prose'),ready:text('候选正文已生成','Draft candidates generated'),partial:text('部分正文未能生成','Some drafts could not be generated'),failed:round.status==='preparation_failed'?text('本章写作准备未完成','Chapter preparation failed'):text('本次正文生成未完成','Draft generation did not complete'),verifying:text('正在读取候选正文','Loading draft candidates'),read_failed:text('进度暂时读取失败','Unable to read progress'),unknown:text('进度待确认','Progress unknown'),stopping:text('正在结束本轮','Ending this round'),cancel_unknown:text('结束请求待确认','Stop request unconfirmed'),cancelled:text('本轮已结束','Round ended'),closed:text('本轮生成已结束','Generation has ended')};
    const descriptions={ready:text('两篇候选已确认保存。点击下方按钮查看并选择采用。','Both drafts are saved. Review the candidates to choose one.'),partial:text('可以查看已生成的正文。未生成部分的费用以笔力明细为准。','The generated draft is available. Check credit details for charges.'),failed:text('费用以笔力明细中的结算结果为准。','Check credit details for the final charges.'),read_failed:text('系统不会重复生成。请重新读取本轮进度。','Generation will not be repeated. Refresh this round’s progress.'),unknown:text('请重新读取本轮进度。','Refresh this round’s progress.'),cancel_unknown:text('结束请求的结果尚未确认，请先重新读取进度。','The stop request is unconfirmed. Refresh progress first.'),cancelled:text('本轮候选不能再采用。已生成的正文仍会计费。','Candidates from this round cannot be adopted. Generated drafts are still charged.')};
    titles.submission_unknown=text('生成请求待确认','Generation request unconfirmed');
    titles.submitting=text('正在提交本轮生成','Submitting this generation');
    descriptions.submission_unknown=text('尚未确认是否已开始生成。可重新读取，或重试同一次请求。','It is not yet known whether generation started. Refresh or retry the original request.');
    if(kind==='failed'&&preparationFailed)titles.failed=text('本章写作准备未完成','Chapter preparation failed');
    if(kind==='failed'&&autoClosed)descriptions.failed=text('本轮已自动结束，可以继续本章操作。费用以笔力明细为准。','This round ended automatically. You can continue working on the chapter. Check credit details for charges.');
    const resultAction=kind==='ready'?'candidates':kind==='partial'?'available':kind==='cancelled'&&ready?'records':null;
    return {kind,rows,ready,creditsRefunded,title:titles[kind],description:descriptions[kind]||'',resultAction,
      running:kind==='running',preparing:kind==='running'&&waiting,busy:['verifying','stopping','submitting'].includes(kind),
      canCancel:!autoClosed&&['running','failed','partial'].includes(kind)&&!!round.round_id&&!round.current_adoption_id,canRefresh:['read_failed','unknown','cancel_unknown','submission_unknown'].includes(kind),
      resultLabel:resultAction==='candidates'?text('查看候选正文','View candidates'):resultAction==='available'?text('查看已生成正文','View generated draft'):text('查看已生成记录','View generated records'),
      dockLabel:kind==='running'?(waiting?text('准备中','Preparing'):text('已生成 ','Generated ')+ready+'/2'):kind==='ready'?text('查看候选','View candidates'):kind==='partial'?text('部分失败','Partial failure'):kind==='verifying'?text('读取中','Loading'):kind==='stopping'?text('停止确认中','Awaiting stop'):kind==='cancelled'||kind==='closed'||autoClosed?text('已结束','Ended'):text('待处理','Needs attention'),
      dockStatus:kind==='ready'?'completed':kind==='running'?'running':['verifying','stopping'].includes(kind)?'verifying':'read_failed',
      // Without a known stage the consumer must keep the existing indeterminate bar.
      showStageProgress:kind==='running',
    };
  }
  return {project};
});
