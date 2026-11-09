'use strict';
/** LỜI HẸN DƯỚI GIÀN HOA — ngoại truyện nối nhiệm vụ 1 và huyết dạ nhiệm vụ 2.
 * Không dịch chuyển Tiểu Phàm; không thay nhiệm vụ 2, bản đồ hoặc hitbox.
 * Lưu riêng để tương thích save v1.8.5/v1.8.6.
 */
const ANguyetStory = (() => {
  const KEY='lang_du_lam_a_nguyet_story_v1';
  const AVATAR='A_Nguyet_Avatar_Duoi_10KB.webp';
  const PHAM='tieu-pham-avatar.webp';
  const GARDEN={x:2400,y:730};
  const GARDEN_NPC={x:2410,y:727};
  const HOME_PATH_END={x:2790,y:508};
  const FINAL_STAGES=['completed','missed','ruins','clue_found'];
  const ACTIVE_STORY_STAGES=['seeking','invitation','escort','ahead','waiting','garden','farewell'];
  function isWeatherProtected(){
    if(isRuined()||!q1Done())return false;
    const q2=q2State();
    if(q2!=='locked'&&q2!=='ready_to_rest')return false;
    return ACTIVE_STORY_STAGES.includes(data.stage);
  }
  function enforceClearWeather(){
    if(!isWeatherProtected()||typeof Weather==='undefined')return;
    if(typeof Weather.clearRain==='function'&&(Weather.kind!=='sun'||Weather.rainIntensity>0||Weather.stormIntensity>0||Weather.snowIntensity>0)){
      Weather.clearRain();
    }else if(typeof Weather.choose==='function'&&Weather.kind&&Weather.kind!=='sun'){
      Weather.choose('sun');
    }
  }
  const DEFAULT=()=>({version:1,stage:'locked',choice:null,affection:0,hasBracelet:false,clueFound:false,meetingDone:false,met:false,invitedDay:null,npcPos:null});
  let data=DEFAULT(),ready=false,seekDelay=0,escortHintTimer=0,leaveTimer=0;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const isRuined=()=>typeof Quest2!=='undefined'&&Quest2.isVillageRuined&&Quest2.isVillageRuined();
  const q1Done=()=>typeof Quest1!=='undefined'&&Quest1.getState&&Quest1.getState()==='completed';
  const q1Chat=()=>typeof Quest1!=='undefined'&&Quest1.isDialogueActive&&Quest1.isDialogueActive();
  const q2State=()=>typeof Quest2!=='undefined'&&Quest2.getState?Quest2.getState():'locked';
  function read(){
    try {const raw=localStorage.getItem(KEY);const parsed=raw&&JSON.parse(raw);
      if(parsed&&parsed.version===1&&typeof parsed.stage==='string')data={...DEFAULT(),...parsed};
    }catch(_e){}
  }
  function persist(){
    if(typeof ANguyet!=='undefined'&&Number.isFinite(ANguyet.x)&&Number.isFinite(ANguyet.y))
      data.npcPos=[Math.round(ANguyet.x*10)/10,Math.round(ANguyet.y*10)/10];
    try{localStorage.setItem(KEY,JSON.stringify(data));}catch(_e){}
  }
  function setStage(s){if(data.stage===s)return;data.stage=s;enforceClearWeather();persist();}
  function alert(message){
    if(typeof Quest1!=='undefined'&&Quest1.showToast)Quest1.showToast(message);
    else {const el=document.getElementById('toast');if(el){el.textContent=message;el.style.opacity=1;}}
  }
  function say(speaker,text,role){return {speaker,role:role||((speaker==='Tiểu Phàm')?'Thiếu niên Làng Du Lãm':'Thanh mai trúc mã · Phàm nhân'),avatar:speaker==='Tiểu Phàm'?PHAM:AVATAR,text};}
  function conversation(script){if(q1Chat()||!Quest1||!Quest1.startDialogue)return false;
    Quest1.startDialogue(script);return true;}
  function showInvitation(){
    if(q1Chat()||!q1Done()||isRuined())return false;
    setStage('invitation');data.met=true;persist();
    return conversation([
      say('A Nguyệt','Tiểu Phàm! Đợi ta với! Ta tìm ngươi từ nãy đến giờ.'),
      say('Tiểu Phàm','A Nguyệt... Ngươi cũng đến xem ta mất mặt sao?'),
      say('A Nguyệt','Ngốc tử! Ta đâu tới để cười ngươi. Nếu một viên đá bảo ngươi vô dụng, thì chẳng lẽ những năm tháng chúng ta bên nhau đều chẳng có ý nghĩa gì?'),
      {...say('A Nguyệt','Đi với ta đến vườn hoa phía đông một lát nhé? Ta có thứ muốn cho ngươi xem.'),choices:[
        {label:'“Được, ta đi với ngươi.”',onSelect:()=>accept('escort')},
        {label:'“Ta có chút việc. Ngươi đến trước đi.”',onSelect:()=>accept('ahead')},
        {label:'“Có chuyện gì mà thần bí vậy?”',onSelect:()=>conversationMystery()}
      ]}
    ]);
  }
  function conversationMystery(){
    Quest1.startDialogue([
      say('A Nguyệt','Hừm... đến rồi mới biết! Ngươi còn nhớ hồi nhỏ thường trốn trưởng làng ra vườn hái hoa chứ?'),
      {...say('A Nguyệt','Hôm nay ta chỉ muốn ngươi đừng buồn nữa. Đi cùng ta nhé?'),choices:[
        {label:'“Được, đi thôi.”',onSelect:()=>accept('escort')},
        {label:'“Ngươi cứ đi trước, ta sẽ đến.”',onSelect:()=>accept('ahead')}
      ]}
    ]);
  }
  function accept(which){
    data.choice=which;persist();
    Quest1.closeDialogue();
    setStage(which);
    if(which==='escort')alert('Lời Hẹn Dưới Giàn Hoa: Đi theo A Nguyệt đến vườn hoa phía đông.');
    else alert('Lời Hẹn Dưới Giàn Hoa: A Nguyệt sẽ chờ ở vườn hoa phía đông.');
  }
  // Quần thể đom đóm dày đặc riêng tại Vườn Hoa Phía Đông (quanh 4 luống hoa [2220..2580, 620..834], lối đi chữ thập và giàn hoa)
  const GARDEN_FIREFLIES=Array.from({length:52},(_,i)=>{
    const angle=(i*2.399963229728653),ring=(i%5)/4;
    const spreadX=Math.cos(angle)*(45+ring*155)+((i%3)-1)*18;
    const spreadY=Math.sin(angle)*(28+ring*96)+((i%2?1:-1)*10);
    return {
      x:GARDEN.x+spreadX,
      y:GARDEN.y+spreadY,
      phase:i*1.37,
      speed:0.55+(i%7)*0.11,
      driftX:14+(i%5)*5,
      driftY:9+(i%4)*4,
      size:1.6+(i%3)*0.55,
      tint:i%4===0?'255,236,138':i%3===0?'178,255,198':'218,255,128'
    };
  });
  function advanceTimeTowardEvening(dt,player){
    if(typeof Villagers==='undefined'||typeof Villagers.minutes!=='number'||!Number.isFinite(dt))return;
    const targetMinutes=18*60+15; // 18:15 Chiều tối / Chập tối
    if(Villagers.minutes>=targetMinutes)return;
    // Tính tiến độ hành trình từ khu vực Quảng trường (x~750) tới Vườn hoa phía đông (x=2400)
    const refX=typeof ANguyet!=='undefined'&&Number.isFinite(ANguyet.x)?Math.max(player?player.x:0,ANguyet.x):(player?player.x:750);
    const progress=Math.max(0,Math.min(1,(refX-750)/(GARDEN.x-750)));
    // Mốc thời gian kỳ vọng theo quãng đường (từ giờ hiện tại tăng dần qua hoàng hôn 17:00-17:45 tới 18:15 khi chạm vườn hoa)
    const minByProgress=Math.min(targetMinutes,Math.max(Villagers.minutes,15.2*60+progress*180));
    const catchup=Math.max(0,minByProgress-Villagers.minutes)*Math.min(1,dt*2.8);
    const rate=(data.stage==='waiting'?38:28)*dt;
    Villagers.minutes=Math.min(targetMinutes,Villagers.minutes+Math.max(rate,catchup));
  }
  function gardenScene(){
    if(q1Chat()||isRuined())return false;
    // Khi bước vào cảnh tâm sự dưới giàn hoa, đảm bảo thời gian đã sang chiều tối (>= 18:15) để đom đóm và đèn lồng bừng sáng
    if(typeof Villagers!=='undefined'&&typeof Villagers.minutes==='number'&&Villagers.minutes<18*60+15){
      Villagers.minutes=18*60+15;
    }
    setStage('garden');
    return conversation([
      say('A Nguyệt','Đến rồi! Ngươi còn nhớ giàn hoa này không?'),
      say('Tiểu Phàm','Đương nhiên nhớ. Hồi nhỏ chúng ta từng trốn trưởng làng đến đây chơi.'),
      say('A Nguyệt','Khi ấy ngươi còn hứa, sau này sẽ đưa ta đi ngắm những nơi đẹp hơn cả vườn hoa này.'),
      say('Tiểu Phàm','Ta... từng nói vậy sao?'),
      say('A Nguyệt','Ngươi dám quên! ... Tiểu Phàm, dù hôm nay ngươi không được tiên nhân chọn, ngươi vẫn là Tiểu Phàm mà ta biết.'),
      say('A Nguyệt','Ta thấy vườn hoa này rất đẹp. Nhưng nếu chỉ có một mình, ta lại chẳng muốn đến.'),
      {...say('A Nguyệt','Sau này, nếu ngươi thực sự rời làng... ngươi sẽ nói gì với ta?'),choices:[
        {label:'“Dù đi xa đến đâu, ta cũng sẽ trở về.”',onSelect:()=>romanticChoice('return',2)},
        {label:'“Nếu thành tiên nhân, ta sẽ đưa ngươi đi cùng.”',onSelect:()=>romanticChoice('together',3)},
        {label:'“Ta chưa biết tương lai sẽ ra sao.”',onSelect:()=>romanticChoice('uncertain',1)}
      ]}
    ]);
  }
  function romanticChoice(choice,affection){
    data.choiceDialogue=choice;data.affection=Math.max(data.affection,affection);persist();
    const responses={
      'return':'A Nguyệt cúi đầu mỉm cười: “Vậy... ta sẽ nhớ lời ngươi nói.”',
      'together':'A Nguyệt đỏ mặt: “Ai bảo muốn đi cùng ngươi chứ! Nhưng... nếu có ngày ấy, ngươi không được nuốt lời đâu.”',
      'uncertain':'A Nguyệt khẽ gật đầu: “Không sao. Chẳng ai biết tương lai. Nhưng ít nhất hôm nay chúng ta còn ở đây.”'
    };
    Quest1.startDialogue([
      say('A Nguyệt',responses[choice]),
      say('A Nguyệt','Đưa tay đây. Ta có món này muốn tặng ngươi.'),
      say('Tiểu Phàm','Để làm gì?'),
      say('A Nguyệt','Đừng hỏi nhiều! Ta tự tết một chiếc vòng chỉ đỏ. Chẳng phải pháp bảo gì... chỉ là lời chúc bình an.'),
      say('Tiểu Phàm','Ngươi sợ ta làm mất sao?'),
      say('A Nguyệt','Ta sợ... ngươi quên mất người đã tặng nó.'),
      say('A Nguyệt','Ngày mai, khi mặt trời mọc, ngươi lại đến đây nhé. Chúng ta cùng ngắm hoa thêm lần nữa.'),
      say('Tiểu Phàm','Được. Một lời đã định.'),
      {...say('A Nguyệt','Không được thất hứa đâu! Trời tối rồi, ngươi về nghỉ sớm đi.'),onFinish:finishGarden}
    ]);
  }
  function finishGarden(){
    data.hasBracelet=true;data.meetingDone=true;persist();
    Quest1.closeDialogue();setStage('farewell');leaveTimer=1.3;
    alert('Nhận kỷ vật: Vòng Chỉ Đỏ Của A Nguyệt. Hãy về nhà nghỉ ngơi.');
    if(typeof GameSave!=='undefined'&&GameSave.save)GameSave.save(true);
  }
  function ruinsClue(){
    if(data.clueFound||q1Chat()||!isRuined())return false;
    data.clueFound=true;setStage('clue_found');persist();
    return conversation([
      say('Tiểu Phàm','Đây là vườn hoa... hôm qua chúng ta vẫn còn cùng nhau đứng ở đây.'),
      say('Tiểu Phàm','Dải ruy băng xanh này... là của A Nguyệt sao?'),
      say('Tiểu Phàm','A Nguyệt... ta đến rồi. Ngươi đã hứa sẽ đợi ta mà...'),
      {...say('Tiểu Phàm','Ta không tìm thấy nàng. Ta cũng chẳng biết nàng còn sống hay không. Nhưng lời hẹn ấy... ta sẽ không quên.'),onFinish:()=>{
        Quest1.closeDialogue();alert('Dấu vết A Nguyệt: tung tích chưa rõ. Lời hẹn vẫn còn dang dở.');
      }}
    ]);
  }
  function init(){
    read();ready=true;
    if(typeof ANguyet==='undefined')return;
    if(Array.isArray(data.npcPos)&&data.npcPos.length===2&&data.npcPos.every(Number.isFinite)){
      ANguyet.place(data.npcPos[0],data.npcPos[1]);
    }else if(['waiting','garden'].includes(data.stage))ANguyet.place(GARDEN_NPC.x,GARDEN_NPC.y);
    else if(data.stage==='farewell')ANguyet.place(GARDEN_NPC.x,GARDEN_NPC.y);
    else if(data.stage==='completed')ANguyet.place(HOME_PATH_END.x,HOME_PATH_END.y);
  }
  function update(dt,t,player){
    if(!ready)init();
    if(!player||typeof ANguyet==='undefined')return;
    const q2=q2State(),ruined=isRuined();
    // Mặc dù Nhiệm vụ 2 mở sẵn sau khảo nghiệm, trò chơi vẫn để người chơi đi dạo rồi tự quyết định giờ ngủ.
    if(q2!=='locked'&&q2!=='ready_to_rest'&&!ruined){
      if(!FINAL_STAGES.includes(data.stage)&&data.stage!=='farewell'){setStage('missed');ANguyet.stop();}
      return;
    }
    if(ruined){
      if(typeof Quest3!=='undefined')return;
      if(!data.clueFound&&(q2==='ruins_explore'||q2==='completed')&&!q1Chat()&&!(typeof TieuPhamHome!=='undefined'&&TieuPhamHome.inside)&&distance(player,GARDEN)<90){ruinsClue();}
      return;
    }
    if(!q1Done())return;
    if(data.stage==='locked'){
      if(q1Chat())return; // Chờ trưởng làng nói xong câu cuối, tuyệt đối không cắt ngang.
      data.invitedDay=typeof Villagers!=='undefined'?Villagers.day:3;
      setStage('seeking');alert('A Nguyệt đang tìm Tiểu Phàm sau buổi khảo nghiệm.');
    }
    enforceClearWeather();
    if(data.stage==='seeking'){
      if(typeof TieuPhamHome!=='undefined'&&TieuPhamHome.inside)return; // Nàng đợi ngoài cửa, không đi xuyên nhà.
      if(!q1Chat()&&distance(player,ANguyet)<85){ANguyet.stop();showInvitation();return;}
      seekDelay+=dt;
      if(seekDelay>.05){
        // Di chuyển thật đến người chơi, có tính đường đi qua cầu giữa hai khu làng.
        ANguyet.moveTo(player.x,player.y,dt,t,95);
      }
    }else if(data.stage==='invitation'){
      if(!q1Chat()&&distance(player,ANguyet)<100)showInvitation();
      else if(!q1Chat())setStage('seeking');
    }else if(data.stage==='escort'||data.stage==='ahead'||data.stage==='waiting'){
      // Khi đi theo A Nguyệt hoặc tiến về vườn hoa, thời gian trôi nhanh mượt mà sang chiều tối
      advanceTimeTowardEvening(dt,player);
      const closeToGirl=distance(player,ANguyet);
      if(data.stage==='escort'&&closeToGirl>205){
        ANguyet.stop();escortHintTimer+=dt;
        if(escortHintTimer>11){escortHintTimer=0;alert('A Nguyệt đang dừng lại chờ Tiểu Phàm. Hãy đến gần nàng.');}
      }else{
        escortHintTimer=0;
        if(data.stage!=='waiting')ANguyet.moveTo(GARDEN_NPC.x,GARDEN_NPC.y,dt,t,95);
      }
      if(distance(ANguyet,GARDEN_NPC)<25&&data.stage!=='waiting'){ANguyet.stop();setStage('waiting');}
      if(data.stage==='waiting'&&!q1Chat()&&!(typeof TieuPhamHome!=='undefined'&&TieuPhamHome.inside)&&distance(player,GARDEN)<92){gardenScene();}
    }else if(data.stage==='garden'){
      if(typeof Villagers!=='undefined'&&typeof Villagers.minutes==='number'&&Villagers.minutes<18*60+15)Villagers.minutes=18*60+15;
      if(!q1Chat()&&distance(player,GARDEN)<110)gardenScene(); // Khôi phục khi tải lại giữa đoạn thoại.
    }else if(data.stage==='farewell'){
      leaveTimer+=dt;
      if(leaveTimer>1.5){
        if(ANguyet.moveTo(HOME_PATH_END.x,HOME_PATH_END.y,dt,t,85))setStage('completed');
      }
    }
  }
  function talk(player){
    if(!q1Done()||isRuined()||q1Chat())return false;
    if(data.stage==='seeking'||data.stage==='invitation'){ANguyet.stop();return showInvitation();}
    if(data.stage==='escort'||data.stage==='ahead'||data.stage==='waiting'){
      if(distance(player,GARDEN)<110&&distance(ANguyet,GARDEN_NPC)<38)return gardenScene();
      alert('A Nguyệt: “Đi với ta đến vườn hoa phía đông nhé!”');return true;
    }
    if(data.stage==='garden')return gardenScene();
    return false;
  }
  function showMarker(){return ['seeking','invitation','escort','ahead','waiting'].includes(data.stage)&&!isRuined();}
  function getHUDInfo(){
    if(!q1Done())return null;
    if(isRuined()){
      if(typeof Quest3!=='undefined'&&Quest3.isCompleted&&Quest3.isCompleted())return null;
      if(typeof Quest3!=='undefined'&&Quest3.getHUDInfo){
        const q3Info=Quest3.getHUDInfo();
        if(q3Info)return q3Info;
      }
      if(data.clueFound)return {title:'Lời Hẹn Dang Dở',tag:'Kỷ Niệm',tagColor:'#e1aabf',objective:'A Nguyệt mất tích',status:'Chưa rõ',statusColor:'#d1aacf',urgent:false,hint:'Đã tìm thấy một dải ruy băng xanh. Tung tích A Nguyệt vẫn chưa rõ.'};
      return {title:'Lời Hẹn Dang Dở',tag:'Dấu Vết',tagColor:'#e1aabf',objective:'Tìm dấu vết vườn hoa',status:'Bí ẩn',statusColor:'#d1aacf',urgent:false,hint:'Nếu có thể, hãy trở lại vườn hoa phía đông sau huyết nạn.'};
    }
    const opts={
      seeking:['A Nguyệt Đang Tìm','Đợi A Nguyệt đến gần','Một người quen đến tìm sau buổi khảo nghiệm.'],
      invitation:['Lời Hẹn Dưới Giàn Hoa','Trò chuyện với A Nguyệt','Nghe lời mời đến khu vườn hoa phía đông.'],
      escort:['Lời Hẹn Dưới Giàn Hoa','Theo A Nguyệt tới vườn hoa','Đi theo nàng qua cầu đến xóm đông; nàng sẽ đứng chờ nếu đi chậm.'],
      ahead:['Lời Hẹn Dưới Giàn Hoa','Đến vườn hoa phía đông','A Nguyệt đang đi trước và sẽ chờ ngươi ở đó.'],
      waiting:['Lời Hẹn Dưới Giàn Hoa','Gặp A Nguyệt trong vườn hoa','Đi đến khu vườn phía đông, giữa bốn luống hoa.'],
      garden:['Lời Hẹn Dưới Giàn Hoa','Tâm sự dưới giàn hoa','A Nguyệt có điều muốn gửi gắm.'],
      farewell:['Lời Hẹn Ngày Mai','Trở về nhà nghỉ ngơi','Kỷ vật: Vòng Chỉ Đỏ Của A Nguyệt. Đêm nay hãy về nghỉ.'],
      completed:['Lời Hẹn Ngày Mai','Trở về nhà nghỉ ngơi','Đã nhận Vòng Chỉ Đỏ Của A Nguyệt. Sáng mai hai người có lời hẹn ở vườn hoa.'],
      missed:['Lời Hẹn Dang Dở','Đêm đã buông xuống','Đã bỏ lỡ buổi chiều cùng A Nguyệt.']
    };
    const o=opts[data.stage];
    if(!o)return null;
    return {title:o[0],tag:'Duyên Phận',tagColor:'#f4bfcb',objective:o[1],status:'Ngoại Truyện',statusColor:'#f4bfcb',urgent:false,hint:o[2]};
  }
  function drawGardenFireflies(ctx,t){
    const wKind=typeof Weather!=='undefined'?Weather.kind:'sun';
    if(wKind==='rain'||wKind==='storm'||wKind==='snow')return;
    const mins=typeof Villagers!=='undefined'&&typeof Villagers.minutes==='number'?Villagers.minutes:720;
    const h=((mins%1440)+1440)%1440/60;
    const inStory=['escort','ahead','waiting','garden','farewell','completed'].includes(data.stage);
    // Đom đóm vườn hoa bắt đầu lấp lánh từ hoàng hôn (17:00) đến sáng sớm (06:00), hoặc khi đang ở cảnh vườn hoa
    let duskFactor=0;
    if(h>=17.5||h<5.5)duskFactor=1;
    else if(h>=16.8&&h<17.5)duskFactor=(h-16.8)/0.7;
    else if(h>=5.5&&h<6.2)duskFactor=(6.2-h)/0.7;
    if(data.stage==='garden'||data.stage==='farewell')duskFactor=Math.max(duskFactor,0.95);
    if(duskFactor<=0.02)return;

    ctx.save();
    ctx.globalCompositeOperation='screen';
    const count=inStory?GARDEN_FIREFLIES.length:36;
    for(let i=0;i<count;i++){
      const f=GARDEN_FIREFLIES[i];
      const x=f.x+Math.sin(t*f.speed+f.phase)*f.driftX+Math.cos(t*0.37+i)*5;
      const y=f.y+Math.cos(t*(f.speed*1.15)+f.phase)*f.driftY-Math.sin(t*1.2+i)*4;
      const pulse=0.28+0.72*Math.pow(0.5+0.5*Math.sin(t*2.1+f.phase),2);
      const alpha=duskFactor*pulse;
      const r=7+f.size*2.8;
      const grad=ctx.createRadialGradient(x,y,0,x,y,r);
      grad.addColorStop(0,`rgba(${f.tint},${(alpha*0.68).toFixed(2)})`);
      grad.addColorStop(0.45,`rgba(${f.tint},${(alpha*0.26).toFixed(2)})`);
      grad.addColorStop(1,`rgba(${f.tint},0)`);
      ctx.fillStyle=grad;
      ctx.fillRect(x-r,y-r,r*2,r*2);
      ctx.fillStyle=`rgba(255,255,215,${Math.min(1,alpha*1.15).toFixed(2)})`;
      ctx.fillRect(Math.round(x-f.size*0.5),Math.round(y-f.size*0.5),Math.round(f.size),Math.round(f.size));
    }
    ctx.restore();
  }
  function drawWorld(ctx,t){
    if(!isRuined()){
      drawGardenFireflies(ctx,t);
      return;
    }
    if(typeof Quest3!=='undefined')return;
    if(data.clueFound)return;
    ctx.save();ctx.translate(GARDEN.x-10,GARDEN.y-9);ctx.rotate(-.45);
    ctx.lineWidth=3;ctx.strokeStyle='#9ccaf5';ctx.beginPath();ctx.moveTo(-8,-4);ctx.quadraticCurveTo(1,6,8,-3);ctx.stroke();
    ctx.strokeStyle='#d6e8ff';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-5,-3);ctx.lineTo(7,-2);ctx.stroke();
    if(Math.sin(t*3)>.25){ctx.fillStyle='#e6ecff88';ctx.fillRect(-13,-12,3,3);}ctx.restore();
  }
  function resetState(){data=DEFAULT();persist();ready=true;if(typeof ANguyet!=='undefined')ANguyet.place(872,700);}
  return {init,update,talk,drawWorld,showMarker,getHUDInfo,isWeatherProtected,resetState,saveState:persist,getData:()=>({...data}),getStage:()=>data.stage,hasBracelet:()=>data.hasBracelet,GARDEN};
})();
