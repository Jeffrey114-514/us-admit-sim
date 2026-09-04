/* 08-events.js — 随机事件表 EVENTS（300 行）+ 抽事件 */
/* ---------- events ---------- */
const EVENTS=[
  {
id:"flu",icon:"烧",cat:"health",stage:[0,1,2,3,4,5,6,7],title:"模考当天发烧",text:"喉咙像吞了砂纸，今天状态全无，考试直接请假。",
   effect:g=>{addStress(g,+12);g.energy=clamp(g.energy-10,0,maxEnergy());return ["bad","发烧退赛，压力 +12、精力 −10。"];}
  },
  {
id:"pet",icon:"猫",cat:"health",stage:[0,1,2,3,4,5,6,7],title:"撸猫治愈",text:"邻居的猫主动蹭过来，紧绷的神经一下松了。",
   effect:g=>{addStress(g,-15);g.energy=clamp(g.energy+5,0,maxEnergy());return ["good","猫猫治愈，压力 −15、精力 +5。"];}
  },
  {
id:"carepkg",icon:"箱",cat:"family",stage:[0,1,2,3,4,5,6,7],title:"爸妈空投补给",text:"一箱零食加现金寄到，家的味道最治愈。",
   effect:g=>{g.energy=clamp(g.energy+12,0,maxEnergy());addStress(g,-8);return ["good","家庭补给，精力 +12、压力 −8。"];}
  },
  {
id:"gacha",icon:"金",cat:"chance",stage:[0,1,2,3,4,5,6,7],title:"抽卡出金",text:"游戏里一发入魂，今天运气玄学在线。",
   effect:g=>{g.stats.luck=clamp(g.stats.luck+1,1,12);return ["good","欧气转移，运气 +1。"];}
  },
  {
id:"burnout",icon:"崩",cat:"health",stage:[0,1,2,3,4,5,6,7],title:"倦怠预警",text:"连续高强度，身体亮红灯。",
   effect:g=>{g.energy=clamp(g.energy-15,0,maxEnergy());addStress(g,+12);return ["bad","倦怠预警，精力 −15、压力 +12。快去休息！"];}
  },
  {
id:"shorts",icon:"短",cat:"health",stage:[0,1,2,3,4,5,6,7],title:"短视频上头",text:"刷了一晚短视频，啥也没干。",
   effect:g=>{g.energy=clamp(g.energy-8,0,maxEnergy());addStress(g,+3);return ["warn","时间黑洞，精力 −8、压力 +3（越刷越慌，什么也没干）。"];}   // 压力系统①：刷短视频本应浪费时间带来焦虑，原为 −5 减压属“该加却减”，改为 +3
  },
  {
id:"proc",icon:"瘫",cat:"health",stage:[0,1,2,3,4,5,6,7],title:"沙发封印一整天",text:"意志力被封印，啥也没干。",
   effect:g=>{addStress(g,+4);return ["warn","摆烂一天，压力 +4（其实更焦虑了），进度还是零。"];}   // 压力系统①：瘫一整天本应更焦虑，原为 −8 减压属“该加却减”，改为 +4
  },
  {
id:"scholar",icon:"光",cat:"chance",stage:[0,1,2,3,4,5,6,7],title:"天降奖学金情报",text:"刷到一条小众项目，正好对口你的特长。",
   effect:g=>{g.stats.creativity=clamp(g.stats.creativity+1,1,12);return ["good","情报到手，创造力 +1。"];}
  },
  {
id:"glitch",icon:"崩",cat:"chance",stage:[6,7],title:"申请系统崩了",text:"申请系统抽风，全网哀嚎，纯属倒霉。",
   effect:g=>{g.stats.luck=clamp(g.stats.luck-1,1,12);return ["bad","系统背刺，运气 −1。"];}
  },
  {
id:"talent",icon:"弹",cat:"creative",stage:[0,1,2,3,4,5,6,7],title:"才艺夜惊艳",text:"学校才艺夜你弹唱封神，成了校园红人。",
   effect:g=>{g.stats.creativity=clamp(g.stats.creativity+1,1,12);g.stats.social=clamp(g.stats.social+1,1,12);return ["good","才艺出圈，创造力 +1、社交 +1。"];}
  },
  {
id:"book",icon:"书",cat:"creative",stage:[0,1,2,3,4,5,6,7],title:"读到神书",text:"一本传记点燃斗志，全属性微涨。",
   effect:g=>{g.stats.academic=clamp(g.stats.academic+1,1,12);g.stats.creativity=clamp(g.stats.creativity+1,1,12);return ["good","被激励到，学术 +1、创造力 +1。"];}
  },
  {
id:"meme",icon:"梗",cat:"creative",stage:[2,3,4,5,6,7],title:"校园梗图主",text:"你做的梗图在校内疯传，成了隐形 KOL。",
   effect:g=>{g.stats.social=clamp(g.stats.social+1,1,12);g.stats.creativity=clamp(g.stats.creativity+1,1,12);return ["good","梗图出圈，社交 +1、创造力 +1。"];}
  },
  {
id:"alumni",icon:"脉",cat:"social",stage:[0,1,2,3,4,5,6,7],title:"校友讲座",text:"听了一场校友分享，拿到内推实习线索。",
   effect:g=>{g.stats.social=clamp(g.stats.social+1,1,12);g.stats.creativity=clamp(g.stats.creativity+1,1,12);return ["good","人脉+灵感，社交 +1、创造力 +1。"];}
  },
  {
id:"exchange",icon:"飞",cat:"social",stage:[2,3,4,5,6,7],title:"交流项目名额",text:"学校放出海外交流，简历镀金好机会。",
   effect:g=>{g.stats.social=clamp(g.stats.social+1,1,12);g.results.ecs.push("海外交流");return ["good","拿下交流名额，社交 +1、履历 +。"];}
  },
  {
id:"fit",icon:"跑",cat:"health",stage:[0,1,2,3,4,5,6,7],title:"健身打卡",text:"坚持晨跑一个月，体能和精神都好了。",
   effect:g=>{g.stats.stamina=clamp(g.stats.stamina+1,1,12);addStress(g,-6);return ["good","健身回血，精力上限 +1、压力 −6。"];}
  },
  {
id:"roommate",icon:"室",cat:"academic",stage:[2,3,4,5,6,7],title:"室友是卷王",text:"室友天天打卡图书馆，你被卷进去了。",
   effect:g=>{g.stats.academic=clamp(g.stats.academic+1,1,12);addStress(g,+6);return ["warn","被室友带飞，学术 +1、压力 +6。"];}
  },
  {
id:"farewell",icon:"别",cat:"social",stage:[2,3,4,5,6,7],title:"好友转学",text:"最好的朋友去了别的城市，有点失落。",
   effect:g=>{g.stats.social=clamp(g.stats.social-1,1,12);addStress(g,+6);return ["bad","离别情绪，社交 −1、压力 +6。"];}
  },
  {
id:"fomo",icon:"焦",cat:"social",stage:[6,7],title:"朋友圈焦虑",text:"看别人晒 offer 预热，开始自我怀疑。",
   effect:g=>{addStress(g,+9);return ["bad","同辈压力，压力 +9。"];}
  },
  {
id:"family",icon:"家",cat:"family",stage:[2,3,4,5,6,7],title:"家里出了点事",text:"家里临时有变故，你不得不分担。",
   choices:[
     {label:"自己扛下来",hint:"社交+1 压力+6",apply:g=>{g.stats.social=clamp(g.stats.social+1,1,12);addStress(g,+6);return ["warn","顶住压力，社交 +1、压力 +6。"];}},
     {label:"找老师求助",hint:"压力-4 精力-5",apply:g=>{addStress(g,-4);g.energy=clamp(g.energy-5,0,maxEnergy());return ["good","及时求助，压力 −4、精力 −5。"];}}
   ]
  },
  {
id:"family_trip",icon:"家",cat:"family",stage:[0,1,2,3,4,5,6,7],title:"全家短途旅行",text:"爸妈强行把你拖去周边游，强制断电两天。",
   effect:g=>{addStress(g,-12);g.energy=clamp(g.energy+10,0,maxEnergy());return ["good","旅行回血，压力 −12、精力 +10。"];}
  },
  {
id:"zk_mock",icon:"测",cat:"academic",stage:[0,1],fit:4,title:"中考一模出炉",text:"成绩不理想，但暴露了薄弱知识点。",
   choices:[
     {label:"分析错题复盘",hint:"学术+1 压力-3",apply:g=>{g.stats.academic=clamp(g.stats.academic+1,1,12);addStress(g,-3);return ["good","查漏补缺，学术 +1、压力 −3。"];}},
     {label:"先摆烂两天",hint:"压力-6",apply:g=>{addStress(g,-6);return ["warn","缓口气，压力 −6，但没涨分。"];}}
   ]
  },
  {
id:"zk_sports",icon:"跑",cat:"health",stage:[0,1],title:"中考体育集训",text:"每天放学后狂练跑步，体能肉眼可见地上来了。",
   effect:g=>{g.stats.stamina=clamp(g.stats.stamina+1,1,12);g.energy=clamp(g.energy-8,0,maxEnergy());addStress(g,+3);return ["good","体能提升，精力上限 +1、精力 −8。"];}
  },
  {
id:"zk_club",icon:"戏",cat:"social",stage:[0,1],title:"初中社团招新",text:"你挑了一个感兴趣的社团，认识了同好。",
   effect:g=>{g.stats.social=clamp(g.stats.social+1,1,12);g.results.ecs.push("初中社团");return ["good","社团初体验，社交 +1、履历 +。"];}
  },
  {
id:"zk_interest",icon:"灵",cat:"creative",stage:[0,1],fit:4,title:"兴趣萌芽",text:"你迷上了某样东西，眼睛一下亮了。",
   choices:[
     {label:"深究下去",hint:"创造力+1.5 压力-3",apply:g=>{g.stats.creativity=clamp(g.stats.creativity+1.5,1,12);addStress(g,-3);return ["good","天赋被点燃，创造力 +1.5、压力 −3。"];}},
     {label:"浅尝辄止",hint:"创造力+0.5",apply:g=>{g.stats.creativity=clamp(g.stats.creativity+0.5,1,12);return ["good","体验一下，创造力 +0.5。"];}}
   ]
  },
  {
id:"zk_parent",icon:"压",cat:"family",stage:[0,1],title:"家长会后施压",text:"“别人家孩子都签约重点了！”压力暴增。",
   effect:g=>{addStress(g,+14);return ["bad","家长施压，压力 +14。记得找时间休息。"];}
  },
  {
id:"zk_burnout",icon:"熬",cat:"health",stage:[0,1],title:"刷题到吐",text:"中考题海战术，人麻了。",
   effect:g=>{g.energy=clamp(g.energy-12,0,maxEnergy());addStress(g,+10);return ["bad","连轴转，精力 −12、压力 +10。"];}
  },
  {
id:"zk_friend",icon:"友",cat:"social",stage:[0,1],title:"初中死党",text:"和死党约好以后要同校。",
   effect:g=>{g.stats.social=clamp(g.stats.social+1,1,12);return ["good","友谊万岁，社交 +1。"];}
  },
  {
id:"hs_adapt",icon:"书",cat:"academic",stage:[2,3],title:"高中第一课",text:"节奏和初中完全不同，你有点懵。",
   choices:[
     {label:"调整节奏",hint:"学术+1 压力-3",apply:g=>{g.stats.academic=clamp(g.stats.academic+1,1,12);addStress(g,-3);return ["good","找到节奏，学术 +1、压力 −3。"];}},
     {label:"硬扛",hint:"学术+0 压力+6",apply:g=>{addStress(g,+6);return ["warn","硬撑着，压力 +6。"];}}
   ]
  },
  {
id:"hs_clubfair",icon:"选",cat:"social",stage:[2,3],title:"百团大战",text:"社团招新，你挑花了眼。",
   effect:g=>{g.stats.social=clamp(g.stats.social+1,1,12);g.results.ecs.push("社团");return ["good","加入社团，社交 +1、履历 +。"];}
  },
  {
id:"hs_teacher",icon:"导",cat:"academic",stage:[2,3],title:"遇上好老师",text:"一位老师看中你，课后开小灶。",
   effect:g=>{g.stats.academic=clamp(g.stats.academic+1,1,12);return ["good","名师指点，学术 +1。"];}
  },
  {
id:"hs_fail",icon:"砸",cat:"academic",stage:[2,3],title:"第一次月考翻车",text:"高中第一次大考，措手不及。",
   effect:g=>{addStress(g,+6);return ["bad","小测翻车，压力 +6。"];}
  },
  {
id:"hs_explore",icon:"探",cat:"creative",stage:[2,3],title:"社团初体验",text:"你在社团里找到归属感。",
   effect:g=>{g.stats.creativity=clamp(g.stats.creativity+0.5,1,12);g.stats.social=clamp(g.stats.social+0.5,1,12);return ["good","探索自我，创造力 +0.5、社交 +0.5。"];}
  },
  {
id:"sat_prep",icon:"测",cat:"academic",stage:[4,5],fit:4,title:"SAT 首考倒计时",text:"标化首考临近，你开始紧张。",
   choices:[
     {label:"全力冲刺",hint:"英语+1 精力-12 压力+6",apply:g=>{g.stats.english=clamp(g.stats.english+1,1,12);g.energy=clamp(g.energy-12,0,maxEnergy());addStress(g,+6);return ["warn","冲刺提分，英语 +1、精力 −12、压力 +6。"];}},
     {label:"平常心",hint:"压力-3",apply:g=>{addStress(g,-3);return ["good","稳住心态，压力 −3。"];}}
   ]
  },
  {
id:"contest_season",icon:"奥",cat:"award",stage:[4,5],fit:4,title:"竞赛季来临",text:"各类学科竞赛扎堆，你挑了主攻方向。",
   choices:[
     {label:"全力冲奖",hint:"奖项+2 精力-15",apply:g=>{g.results.awards+=2;g.energy=clamp(g.energy-15,0,maxEnergy());return ["good","竞赛发力，奖项 +2，精力 −15。"];}},
     {label:"浅尝辄止",hint:"压力-5",apply:g=>{addStress(g,-5);return ["warn","体验一下，压力 −5，没拿奖。"];}}
   ]
  },
  {
id:"research_start",icon:"研",cat:"academic",stage:[4,5],fit:4,title:"进实验室搬砖",text:"教授招本科生助研，你被选上了。",
   effect:g=>{g.stats.academic=clamp(g.stats.academic+1,1,12);g.energy=clamp(g.energy-10,0,maxEnergy());return ["good","助研入门，学术 +1、精力 −10。"];}
  },
  {
id:"ap_exam",icon:"考",cat:"academic",stage:[4,5],title:"AP 大考周",text:"一周五门 AP，脑子快要炸了。",
   effect:g=>{g.energy=clamp(g.energy-10,0,maxEnergy());addStress(g,+8);return ["warn","AP 周，精力 −10、压力 +8。"];}
  },
  {
id:"summer_program",icon:"夏",cat:"chance",stage:[4,5],title:"夏校放榜",text:"梦校夏校结果下来了。",
   choices:[
     {label:"录取！",hint:"社交+1 履历+",apply:g=>{g.stats.social=clamp(g.stats.social+1,1,12);g.results.ecs.push("夏校");return ["good","夏校录取，社交 +1、履历 +。"];}},
     {label:"被拒",hint:"学术+1 压力+6",apply:g=>{g.stats.academic=clamp(g.stats.academic+1,1,12);addStress(g,+6);return ["warn","被拒但更拼了，学术 +1、压力 +6。"];}}
   ]
  },
  {
id:"club_lead",icon:"社",cat:"social",stage:[4,5],fit:3,title:"社团上位",text:"换届选举你当选了社长。",
   effect:g=>{g.stats.social=clamp(g.stats.social+2,1,12);g.results.ecs.push("社团社长");return ["good","从零带社，社交 +2、履历 +。"];}
  },
  {
id:"hack_season",icon:"黑",cat:"creative",stage:[4,5],title:"科创节",text:"学校科创节，你做了个项目。",
   effect:g=>{g.stats.creativity=clamp(g.stats.creativity+1,1,12);g.results.reputation=clamp(g.results.reputation+2,0,100);g.results.ecs.push("科创");return ["good","科创出手，创造力 +1、声望 +2、履历 +。"];}
  },
  {
id:"essay_block",icon:"灵",cat:"creative",stage:[6,7],fit:5,title:"文书卡壳",text:"主文书改了八版还是不对味。",
   choices:[
     {label:"推倒重写",hint:"文书+1 压力+5",apply:g=>{g.results.essayQuality=clamp(g.results.essayQuality+1,0,10);addStress(g,+5);return ["good","灵感来了，文书质量 +1、压力 +5。"];}},
     {label:"先放着",hint:"压力-3",apply:g=>{addStress(g,-3);return ["warn","缓一缓，压力 −3。"];}}
   ]
  },
  {
id:"rec_ask",icon:"导",cat:"award",stage:[6,7],fit:5,title:"找推荐人",text:"你鼓起勇气找老师写推荐信。",
   effect:g=>{g.results.recQuality=clamp(g.results.recQuality+1,0,10);return ["good","拿到承诺，推荐信质量 +1。"];}
  },
  {
id:"early_night",icon:"夜",cat:"chance",stage:[6,7],title:"早申提交夜",text:"ED 截止前最后一晚，心跳加速。",
   effect:g=>{addStress(g,+6);g.energy=clamp(g.energy-5,0,maxEnergy());return ["warn","截止夜，压力 +6、精力 −5。"];}
  },
  {
id:"waitlist_dread",icon:"焦",cat:"social",stage:[6,7],title:"早申放榜日",text:"同学早申陆续上岸，你五味杂陈。",
   choices:[
     {label:"替他人开心",hint:"社交+1",apply:g=>{g.stats.social=clamp(g.stats.social+1,1,12);return ["good","大方祝福，社交 +1。"];}},
     {label:"自我怀疑",hint:"压力+8",apply:g=>{addStress(g,+8);return ["bad","陷入内耗，压力 +8。"];}}
   ]
  },
  {
id:"final_rush",icon:"考",cat:"academic",stage:[6,7],title:"申请季冲刺",text:"RD 截止前最后两周，连轴转。",
   effect:g=>{g.energy=clamp(g.energy-12,0,maxEnergy());addStress(g,+10);return ["bad","冲刺期，精力 −12、压力 +10。"];}
  },
  {
id:"interview",icon:"谈",cat:"social",stage:[6,7],title:"校友面试",text:"和校友面试官聊得投机。",
   effect:g=>{g.stats.social=clamp(g.stats.social+1,1,12);g.results.recQuality=clamp(g.results.recQuality+0.5,0,10);return ["good","面试顺利，社交 +1、推荐信 +。"];}
  },
  {
id:"submit_relief",icon:"舒",cat:"health",stage:[6,7],title:"提交完毕",text:"最后一所提交，如释重负。",
   effect:g=>{addStress(g,-15);g.energy=clamp(g.energy+8,0,maxEnergy());return ["good","尘埃落定，压力 −15、精力 +8。"];}
  },
  {
id:"power_rec",icon:"导",cat:"award",stage:[2,3,4,5,6,7],power:true,title:"业界大牛亲笔推荐",text:"你帮过的教授主动要给你写强推，分量极重。",
   effect:g=>{g.results.spike=clamp((g.results.spike||0)+1,0,3);g.results.recQuality=clamp(g.results.recQuality+3,0,10);g.results.reputation=clamp(g.results.reputation+8,0,100);return ["good","神级推荐信！推荐信 +3、声望 +8、顶尖校“信号弹”+1。"];}
  },
  {
id:"power_intl_award",icon:"奖",cat:"award",stage:[2,3,4,5,6,7],power:true,title:"国际大赛折桂",text:"你站上了国际领奖台，惊艳众人。",
   effect:g=>{g.results.spike=clamp((g.results.spike||0)+1,0,3);g.results.awards+=3;g.results.reputation=clamp(g.results.reputation+10,0,100);g.stats.academic=clamp(g.stats.academic+1,1,12);return ["good","国际大奖！奖项 +3、声望 +10、学术 +1、顶尖校“信号弹”+1。"];}
  },
  {
id:"power_paper",icon:"光",cat:"academic",stage:[2,3,4,5,6,7],power:true,title:"一作论文发表",text:"你的研究被顶会接收，署名第一作者。",
   effect:g=>{g.results.spike=clamp((g.results.spike||0)+1,0,3);g.stats.academic=clamp(g.stats.academic+1,1,12);g.results.reputation=clamp(g.results.reputation+10,0,100);g.results.ecs.push("一作论文");return ["good","论文发表！学术 +1、声望 +10、履历 +1、顶尖校“信号弹”+1。"];}
  },
  {
id:"power_patron",icon:"脉",cat:"chance",stage:[2,3,4,5,6,7],power:true,title:"贵人引路",text:"一位校友长辈愿意内推并长期指导你。",
   effect:g=>{g.results.spike=clamp((g.results.spike||0)+1,0,3);g.results.reputation=clamp(g.results.reputation+10,0,100);g.results.recQuality=clamp(g.results.recQuality+2,0,10);return ["good","贵人相助，声望 +10、推荐信 +2、顶尖校“信号弹”+1。"];}
  },
  {
id:"power_tip",icon:"灵",cat:"chance",stage:[6,7],power:true,title:"招生官点拨",text:"线上活动里招生官私下给了关键建议。",
   effect:g=>{g.results.spike=clamp((g.results.spike||0)+1,0,3);g.results.essayQuality=clamp(g.results.essayQuality+2,0,10);g.results.recQuality=clamp(g.results.recQuality+1,0,10);return ["good","内部点拨，文书 +2、推荐信 +1、顶尖校“信号弹”+1。"];}
  },
  {
id:"cs_opensource",icon:"黑",cat:"creative",stage:[4,5],majors:["cs"],fit:10,title:"开源项目爆火",text:"你写的库被很多人用，star 疯涨。",
   effect:g=>{g.stats.creativity=clamp(g.stats.creativity+1,1,12);g.results.reputation=clamp(g.results.reputation+3,0,100);g.results.ecs.push("开源项目");return ["good","项目出圈，创造力 +1、声望 +3、履历 +。"];}
  },
  {
id:"cs_ctf",icon:"黑",cat:"award",stage:[4,5],majors:["cs"],fit:10,title:"CTF 全国冠军",text:"你和队友一路过关拿下全国第一。",
   effect:g=>{g.results.awards++;g.stats.creativity=clamp(g.stats.creativity+1,1,12);g.results.reputation=clamp(g.results.reputation+5,0,100);g.results.ecs.push("CTF 冠军");return ["good","CTF 夺冠，奖项 +1、创造力 +1、声望 +5。"];}
  },
  {
id:"biz_angel",icon:"旗",cat:"social",stage:[4,5],majors:["biz"],fit:10,title:"创业拿天使",text:"你的项目拿到第一笔投资。",
   effect:g=>{g.stats.social=clamp(g.stats.social+1,1,12);g.results.reputation=clamp(g.results.reputation+3,0,100);g.results.ecs.push("创业");return ["good","拿到天使轮，社交 +1、声望 +3、履历 +。"];}
  },
  {
id:"biz_final",icon:"旗",cat:"award",stage:[4,5],majors:["biz"],fit:10,title:"商赛全国总决",text:"带队杀进全国总决赛。",
   effect:g=>{g.results.awards++;g.stats.social=clamp(g.stats.social+1,1,12);g.results.reputation=clamp(g.results.reputation+3,0,100);g.results.ecs.push("商赛总决赛");return ["good","商赛折桂，奖项 +1、社交 +1、声望 +3。"];}
  },
  {
id:"sci_isef",icon:"奥",cat:"award",stage:[4,5],majors:["sci"],fit:10,title:"工程大赛入围",text:"你的课题入围国际科学与工程大赛。",
   effect:g=>{g.results.awards++;g.stats.academic=clamp(g.stats.academic+1,1,12);g.results.reputation=clamp(g.results.reputation+3,0,100);g.results.ecs.push("科研大赛");return ["good","大赛入围，奖项 +1、学术 +1、声望 +3。"];}
  },
  {
id:"sci_lab",icon:"研",cat:"academic",stage:[4,5],majors:["sci"],fit:10,title:"独立课题",text:"你有了自己的研究课题。",
   effect:g=>{g.stats.academic=clamp(g.stats.academic+1,1,12);g.results.reputation=clamp(g.results.reputation+2,0,100);g.results.ecs.push("独立课题");return ["good","独立科研，学术 +1、声望 +2、履历 +。"];}
  },
  {
id:"soc_mun",icon:"辩",cat:"award",stage:[4,5],majors:["soc"],fit:10,title:"模拟联合国获奖",text:"你在模联拿下最佳代表。",
   effect:g=>{g.results.awards++;g.stats.social=clamp(g.stats.social+1,1,12);g.results.reputation=clamp(g.results.reputation+2,0,100);g.results.ecs.push("模联");return ["good","模联获奖，奖项 +1、社交 +1、声望 +2。"];}
  },
  {
id:"soc_media",icon:"脉",cat:"social",stage:[4,5],majors:["soc"],fit:10,title:"调研被转载",text:"你的社会调研被媒体转载。",
   effect:g=>{g.stats.social=clamp(g.stats.social+1,1,12);g.stats.creativity=clamp(g.stats.creativity+1,1,12);g.results.reputation=clamp(g.results.reputation+2,0,100);g.results.ecs.push("调研发表");return ["good","调研出圈，社交 +1、创造力 +1、声望 +2。"];}
  },
  {
id:"art_gallery",icon:"弹",cat:"creative",stage:[4,5],majors:["art"],fit:10,title:"作品集被收藏",text:"你的作品被画廊收藏。",
   effect:g=>{g.stats.creativity=clamp(g.stats.creativity+1,1,12);g.results.reputation=clamp(g.results.reputation+3,0,100);g.results.ecs.push("作品集");return ["good","作品被收藏，创造力 +1、声望 +3、履历 +。"];}
  },
  {
id:"art_award",icon:"弹",cat:"award",stage:[4,5],majors:["art"],fit:10,title:"设计大赛金奖",text:"你拿下了设计金奖。",
   effect:g=>{g.results.awards++;g.stats.creativity=clamp(g.stats.creativity+1,1,12);g.results.reputation=clamp(g.results.reputation+3,0,100);g.results.ecs.push("设计金奖");return ["good","设计金奖，奖项 +1、创造力 +1、声望 +3。"];}
  },
  {
id:"med_shadow",icon:"研",cat:"academic",stage:[4,5],majors:["med"],fit:10,title:"名医见习",text:"你跟随医生临床见习。",
   effect:g=>{g.stats.academic=clamp(g.stats.academic+1,1,12);g.stats.social=clamp(g.stats.social+0.5,1,12);g.results.reputation=clamp(g.results.reputation+2,0,100);g.results.ecs.push("临床见习");return ["good","临床见习，学术 +1、社交 +、声望 +2、履历 +。"];}
  },
  {
id:"med_olympiad",icon:"奥",cat:"award",stage:[4,5],majors:["med"],fit:10,title:"医学竞赛获奖",text:"你拿了生物奥赛奖。",
   effect:g=>{g.results.awards++;g.stats.academic=clamp(g.stats.academic+1,1,12);g.results.reputation=clamp(g.results.reputation+2,0,100);g.results.ecs.push("生物奥赛");return ["good","奥赛获奖，奖项 +1、学术 +1、声望 +2。"];}
  },
  {
id:"zk_grad",icon:"友",cat:"social",stage:[0,1],fit:3,title:"初中毕业典礼",text:"三年初中落幕，你和不舍的朋友约定未来要同校。",
   effect:g=>{g.stats.social=clamp(g.stats.social+1,1,12);g.stats.creativity=clamp(g.stats.creativity+0.5,1,12);g.results.ecs.push("初中毕业");return ["good","毕业季，社交 +1、创造力 +、履历 +。"];}
  },
  {
id:"zk_clubwin",icon:"奖",cat:"award",stage:[0,1],fit:3,title:"社团拿了区奖",text:"你张罗的初中社团在全市评比里拿了奖。",
   choices:[
     {label:"趁热打铁招新",hint:"社交+1 声望+1",apply:g=>{g.stats.social=clamp(g.stats.social+1,1,12);g.results.reputation=clamp(g.results.reputation+1,0,100);g.results.ecs.push("社团获奖");return ["good","社团影响力扩大，社交 +1、声望 +1、履历 +。"];}},
     {label:"见好就收",hint:"压力-3",apply:g=>{addStress(g,-3);return ["warn","低调收尾，压力 −3，但没再扩张。"];}}
   ]
  },
  {
id:"cs_intern",icon:"码",cat:"academic",stage:[4,5],majors:["cs"],fit:10,title:"大厂暑期实习",text:"你拿下了一家科技公司的开发实习，真刀真枪写业务代码。",
   effect:g=>{g.stats.academic=clamp(g.stats.academic+1,1,12);g.results.reputation=clamp(g.results.reputation+2,0,100);g.results.ecs.push("大厂实习");return ["good","实习历练，学术 +1、声望 +2、履历 +。"];}
  },
  {
id:"cs_hackathon",icon:"码",cat:"creative",stage:[4,5],majors:["cs"],fit:10,title:"黑客松通宵",text:"48 小时极限开发，你和队友肝出一个能跑的 demo。",
   choices:[
     {label:"冲一把最佳作品",hint:"奖项+1 创造力+1 压力+4",apply:g=>{g.results.awards++;g.stats.creativity=clamp(g.stats.creativity+1,1,12);addStress(g,+4);g.results.ecs.push("黑客松");return ["good","拿下最佳作品，奖项 +1、创造力 +1、履历 +，但压力 +4。"];}},
     {label:"佛系参与攒经验",hint:"创造力+0.5 社交+0.5",apply:g=>{g.stats.creativity=clamp(g.stats.creativity+0.5,1,12);g.stats.social=clamp(g.stats.social+0.5,1,12);g.results.ecs.push("黑客松");return ["good","重在参与，创造力 +、社交 +、履历 +。"];}}
   ]
  }
];
const catOf=e=>e.cat||"chance";
function drawEvent(){
  const r=G.round;
  const majorOk=e=>!e.majors || (G.major!=="und" && e.majors.includes(G.major));
  let pool=EVENTS.filter(e=>e.stage.includes(r)&&majorOk(e)&&!G.usedEvents.includes(e.id));
  if(!pool.length) pool=EVENTS.filter(e=>majorOk(e)&&!G.usedEvents.includes(e.id));
  if(!pool.length) pool=EVENTS;
  const powers=pool.filter(e=>e.power);
  if(powers.length && G.powerCount<2 && Math.random()<0.10){   // #10 power 触发率 0.20→0.10，且每局最多 2 次
    const e=pick(powers); G.usedEvents.push(e.id); G.powerCount++; if(G.usedEvents.length>20)G.usedEvents.shift(); return e;
  }
  const norm=pool.filter(e=>!e.power);
  const src=norm.length?norm:pool;
  const e=weightedPick(src, ev=>ev.fit||3); G.usedEvents.push(e.id); if(G.usedEvents.length>20)G.usedEvents.shift(); return e;
}

