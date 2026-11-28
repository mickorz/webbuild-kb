/* ===== 建书生成深度 + FAQ data (zh/en) ===== */
window.BUILD_SPEC = {
  totals:{
    dims:{zh:'世界维度',en:'world axes'},
    fields:{zh:'结构化字段',en:'structured fields'},
    before:{zh:'在你写下第一个字之前',en:'before you write a single word'},
  },
  systems:[
    {
      key:'world', n:{zh:'世界观',en:'Worldbuilding'},
      tag:{zh:'6 一级维度 · 28 子维度',en:'6 axes · 28 sub-axes'},
      dims:[
        {n:{zh:'核心法则',en:'Core Laws'},c:4,sub:{zh:['力量体系','世界公理','禁忌红线','力量感官表现'],en:['Power system','Axioms','Taboos','Sensory manifestation']}},
        {n:{zh:'时空地理',en:'Space & Geography'},c:5,sub:{zh:['世界格局','关键地点','生态资源','时代阶段','环境质感'],en:['World layout','Key places','Ecology','Era stage','Atmosphere']}},
        {n:{zh:'社会权力',en:'Power & Society'},c:6,sub:{zh:['种族','阶层结构','政治体制','势力','势力关系','权力感知'],en:['Races','Class structure','Politics','Factions','Faction ties','Power perception']}},
        {n:{zh:'历史文化',en:'History & Culture'},c:5,sub:{zh:['重大事件','宗教','风俗习惯','经济体系','日常切片'],en:['Major events','Religion','Customs','Economy','Daily life']}},
        {n:{zh:'存在基础',en:'Foundations of Being'},c:4,sub:{zh:['历法','寿命','死亡','疾病与繁衍'],en:['Calendar','Lifespan','Death','Disease & birth']}},
        {n:{zh:'信息传播',en:'Information Flow'},c:4,sub:{zh:['信息速度','知识载体','信息壁垒','流言与真相'],en:['Info speed','Knowledge carriers','Info barriers','Rumor & truth']}},
      ]
    },
    {
      key:'char', n:{zh:'角色系统',en:'Character System'},
      tag:{zh:'阵容级 + 逐角色 · 14 维模型',en:'roster + per-character · 14-axis model'},
      dims:[
        {n:{zh:'角色骨架 · 阵容级',en:'Skeleton · roster'},c:4,sub:{zh:['身份站位','出身势力','世界锚点','关系网络'],en:['Identity & stance','Origin & faction','World anchor','Relationship web']}},
        {n:{zh:'信念生态 · 阵容级',en:'Belief Ecology · roster'},c:3,sub:{zh:['核心信念','信念来源','作者视角'],en:['Core belief','Belief source','Author lens']}},
        {n:{zh:'角色深层 · 逐角色',en:'Depth · per-character'},c:7,sub:{zh:['核心欲望','深层恐惧','秘密','底线','关键创伤','内在矛盾','成长弧线'],en:['Core desire','Deep fear','Secret','Bottom line','Key trauma','Inner conflict','Arc potential']}},
      ]
    },
    {
      key:'story', n:{zh:'故事引擎',en:'Story Engine'},
      tag:{zh:'3 层 · 18 字段',en:'3 layers · 18 fields'},
      dims:[
        {n:{zh:'显性层',en:'Surface'},c:6,sub:{zh:['核心立意','核心冲突','读者承诺','基调参照','目标读者','商业标签'],en:['Premise','Core conflict','Reader promise','Tone reference','Target readers','Commercial tags']}},
        {n:{zh:'引擎层',en:'Engine'},c:7,sub:{zh:['主角困局','冲突引擎','三层冲突','悬念盒子','进度循环','前台故事','后台暗线'],en:['Protagonist trap','Conflict engine','3-layer conflict','Mystery box','Progression loop','Front story','Back-stage thread']}},
        {n:{zh:'兑现层',en:'Payoff'},c:5,sub:{zh:['张力原型','回报语法','情绪节奏','成长路径','结局气味'],en:['Tension archetype','Payoff grammar','Emotional rhythm','Growth path','Ending flavor']}},
      ]
    },
  ]
};

window.FAQ = [
  {
    q:{zh:'世界自己在运行，导演又在编排故事——冲突了听谁的？',en:'The world runs on its own, the director shapes the story — who wins when they clash?'},
    a:{zh:'两者本就不是从属关系。我们有专门的<strong>导演 Agent</strong> 与<strong>冲突裁决 Agent</strong> 协调走向，你也可以随时介入拍板。而且很多时候——<em>碰撞本身就是最大的看点</em>。世界的"不配合"，往往逼出比预设更精彩的转折。',
       en:'Neither serves the other by default. A dedicated <strong>Director Agent</strong> and <strong>Arbiter Agent</strong> reconcile the direction, and you can step in anytime. Often the <em>collision itself is the best part</em> — a world that "won\'t cooperate" forces turns better than anything you\'d have scripted.'}
  },
  {
    q:{zh:'我需要一个字一个字地审、一句一句地改吗？',en:'Do I have to review and rewrite line by line?'},
    a:{zh:'完全不用。笔枢有两种写作模式：<strong>Auto Driver 全自动碰撞</strong>——世界状态机与导演自由推演、整章涌现；<strong>协同审校</strong>——你在任意节点接管，而审校与改稿同样有 Agent 辅助：给方向，不必逐字。两种模式之间连续可调。',
       en:'Not at all. Novelbuilt has two modes: <strong>Auto Driver</strong> — the state machine and director run freely and a whole chapter emerges; and <strong>Co-pilot review</strong> — you take over at any node, with agents assisting the review and rewrite. Give direction, not keystrokes. The two are a continuous dial.'}
  },
  {
    q:{zh:'为什么要在动笔前生成这么多设定？',en:'Why generate so much before writing a word?'},
    a:{zh:'这是<strong>冰山理论</strong>。读者和主角看不到、故事里还没出场，<em>不代表事件没有发生</em>。水面之下完整运转的世界，才让水面之上的每一次转折都"有来由"——而不是临时编造。',
       en:'It\'s the <strong>iceberg principle</strong>. Just because the reader and protagonist can\'t see it — and it hasn\'t entered the story yet — <em>doesn\'t mean it didn\'t happen</em>. A world fully running below the surface is what makes every turn above it earned, not improvised.'}
  },
  {
    q:{zh:'AI 真的能写好长篇吗？',en:'Can AI really write long-form fiction well?'},
    a:{zh:'我们不在"AI 写得像不像人"那条赛道上。笔枢做的是<strong>世界模拟</strong>——你得到的不是一个写手，是一台让故事自洽涌现的引擎。',
       en:'We\'re not racing on "does the AI sound human." Novelbuilt does <strong>world simulation</strong> — you\'re not buying a writer, you\'re buying an engine from which a coherent story emerges.'}
  },
  {
    q:{zh:'写到几百章，设定会前后矛盾、"失忆"吗？',en:'At hundreds of chapters, will canon contradict itself or get "amnesia"?'},
    a:{zh:'世界状态机每章做一致性校验，分层长期记忆让近处清晰、远处凝练、需要时精准检索。百万字也守得住设定与伏笔。',
       en:'The state machine runs a consistency check every chapter, and layered long-term memory keeps near detail sharp, distant threads condensed, and retrieval precise — canon and setups hold across a million words.'}
  },
];

window.I18N_BUILD = {
  zh:{
    'build.kicker':'建书生成深度 · The Iceberg',
    'build.title':'动笔之前，<br>我们先为你造好<em>一座冰山</em>。',
    'build.sub':'水面之上是读者看到的故事；水面之下，是一个在你写每一章之前就已经完整运转的世界。主角看不到、还没登场，不代表事件没有发生。',
    'build.tipTop':'读者 · 主角看到的','build.tipBelow':'已生成并持续运转的世界状态',
    'build.t1':'世界子维度','build.t2':'角色模型维度','build.t3':'故事引擎字段',
    'build.tabhint':'点选切换 · 查看每一层生成了什么',
    'build.foot':'这一切，先于第一行文字而存在。',
    'modes.kicker':'两种写作方式 · Your call',
    'modes.title':'要不要接管，<em>由你说了算</em>。',
    'modes.sub':'笔枢不强迫你逐字盯稿。从全自动到全接管，连续可调——而且，审校与改稿同样有 Agent 辅助。',
    'modes.m1tag':'Auto Driver','modes.m1t':'全自动碰撞','modes.m1d':'放手让世界状态机与导演自由推演，事件自然碰撞、整章涌现。你只看结果，随时可以叫停。',
    'modes.m1f':'适合：放养式追更 · 探索世界会长成什么样',
    'modes.m2tag':'Co-pilot','modes.m2t':'协同审校','modes.m2d':'在任意节点接管：调整走向、批注重写、锁定爽点。审校与改稿有 Agent 辅助——你给方向，不必逐字敲。',
    'modes.m2f':'适合：连载把控 · 要稳定质量与个人风格',
    'modes.dial1':'全托管','modes.dial2':'连续可调','modes.dial3':'全接管',
    'faq.kicker':'常见问题 · FAQ',
    'faq.title':'你大概会问的<br>几个<em>关键问题</em>。',
    'faq.more':'还有疑问？',
    'faq.contact':'联系我们 →',
  },
  en:{
    'build.kicker':'Generation depth · The Iceberg',
    'build.title':'Before a word is written,<br>we forge you <em>an iceberg</em>.',
    'build.sub':'Above the surface is the story readers see; below it is a world already running in full before you write each chapter. Unseen by the protagonist, not yet on the page — that doesn\'t mean it didn\'t happen.',
    'build.tipTop':'What readers · the protagonist see','build.tipBelow':'World state already generated and running',
    'build.t1':'world sub-axes','build.t2':'character-model axes','build.t3':'story-engine fields',
    'build.tabhint':'Tap to switch · see what each layer generates',
    'build.foot':'All of it exists before the first line of prose.',
    'modes.kicker':'Two ways to write · Your call',
    'modes.title':'Whether to take over<br>is <em>entirely up to you</em>.',
    'modes.sub':'Novelbuilt never forces you to babysit the page. From fully automatic to fully hands-on, it\'s a continuous dial — and review and rewrites are agent-assisted too.',
    'modes.m1tag':'Auto Driver','modes.m1t':'Auto collision','modes.m1d':'Let the state machine and director run free — events collide and whole chapters emerge. You just read the result, and can stop anytime.',
    'modes.m1f':'For: hands-off binge-writing · seeing what the world becomes',
    'modes.m2tag':'Co-pilot','modes.m2t':'Co-pilot review','modes.m2d':'Take over at any node: steer direction, annotate rewrites, lock in payoffs. Review and rewriting are agent-assisted — give direction, not keystrokes.',
    'modes.m2f':'For: serial control · stable quality and personal voice',
    'modes.dial1':'Fully auto','modes.dial2':'continuous dial','modes.dial3':'Fully hands-on',
    'faq.kicker':'FAQ',
    'faq.title':'A few <em>key questions</em><br>you\'re probably asking.',
    'faq.more':'Still have questions?',
    'faq.contact':'Contact us →',
  }
};
