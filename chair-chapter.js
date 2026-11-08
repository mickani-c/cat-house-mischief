export const chairMethods={
  mochi:{name:'借麻糬引開主人',line:'麻糬，你又追住啲聲玩？我過去睇吓先。'},
  break:{name:'等主人休息',line:'坐咗咁耐，起身伸展、飲啖水先。'},
  soft:{name:'溫柔討摸',line:'好啦，我起身陪你一陣。過嚟呀。'},
  loud:{name:'大聲催玩',line:'知道啦！我去攞逗貓棒，等我一陣。'},
  keyboard:{name:'鍵盤搗蛋',line:'又幫我亂打字！攞個玩具引你落嚟先。'},
  monitor:{name:'遮住屏幕',line:'成個屏幕都係你……我去攞玩具，好嗎？'},
  curtain:{name:'抓抓窗簾',line:'停手呀！我搵個夾固定返幅窗簾先。'}
};

// One objective, several causes. Timing uses game time so a hidden tab cannot eat the opportunity.
export function createChairChapter(){
  const chapter={};
  function reset(now=0){Object.assign(chapter,{stage:'working',breakAt:now+24,method:null,softCalls:0,lastSoft:-Infinity,until:Infinity,seatOpen:false,holdAt:null,looked:false,attempts:0});}
  function offer(kind,now){
    if(chapter.stage!=='working'||!chairMethods[kind])return null;
    if(kind==='soft'){
      if(now-chapter.lastSoft>30)chapter.softCalls=0;
      chapter.lastSoft=now;
      if(++chapter.softCalls<2)return {type:'ack',line:'嗯？想我陪你呀？'};
    }
    chapter.stage='rising';chapter.method=kind;chapter.until=now+.75;chapter.attempts++;
    return {type:'rise',line:chairMethods[kind].line};
  }
  function tick(now,{away=false,arrived=false,onChair=false,jumping=false}={}){
    if(chapter.stage==='working'&&now>=chapter.breakAt)return offer('break',now);
    if(chapter.stage==='rising'&&now>=chapter.until){chapter.stage='leaving';return {type:'depart'};}
    if(['leaving','waiting'].includes(chapter.stage)){
      chapter.seatOpen=away;
      if(onChair&&!jumping){chapter.stage='settling';chapter.holdAt=now;chapter.seatOpen=false;return {type:'settle'};}
      if(chapter.stage==='leaving'&&arrived){chapter.stage='waiting';chapter.until=now+24;}
      if(chapter.stage==='waiting'&&now>=chapter.until){chapter.stage='returning';chapter.seatOpen=false;return {type:'return'};}
    }
    if(chapter.stage==='settling'){
      if(!onChair||jumping){chapter.stage='waiting';chapter.until=now+16;chapter.holdAt=null;chapter.looked=false;return {type:'escaped'};}
      if(!chapter.looked&&now-chapter.holdAt>=1.1){chapter.looked=true;return {type:'look'};}
      if(chapter.looked&&now-chapter.holdAt>=3.5){chapter.stage='won';return {type:'win'};}
    }
    if(chapter.stage==='returning'&&arrived){chapter.stage='working';chapter.softCalls=0;chapter.breakAt=now+24;return {type:'retry'};}
    return null;
  }
  reset();
  return {state:chapter,reset,offer,tick};
}
