() => {
const q=__BB; q.stop(); const tests=[];
function check(name,yes,detail={}){tests.push({name,passed:!!yes,detail});}
function step(n){q.step(n)} function tap(k,n=1){q.press(k);step(n);q.release(k);step(1)}
function clear(){q.clear()} function place(x,y,z){clear();q.teleport(x,y,z);step(2)}
function endDialog(){for(let i=0;i<8&&q.state==='dialogue';i++)q.dialog();if(q.state==='reward')q.reward()}
function info(){let p=q.player;return{x:p.x,y:p.y,z:p.z,hp:p.hp,grounded:p.grounded,floor:p.floorId};}
q.start();step(2);check('New game starts grounded in Hearthgrove',q.room==='hearth'&&q.state==='playing'&&q.player.grounded);
place(0,0,18);q.press('KeyW');step(60);q.release('KeyW');let walk=18-q.player.z;check('W moves forward at walking speed',walk>5.8&&walk<7,info());
place(0,0,18);q.press('ShiftLeft');q.press('KeyW');step(60);let sprint=18-q.player.z;clear();check('Sprint is faster than walking',sprint>walk+1.5,{walk,sprint});
place(0,0,18);q.press('KeyW');q.press('KeyD');step(40);let diag=Math.hypot(q.player.x,q.player.z-18);clear();place(0,0,18);q.press('KeyW');step(40);let straight=Math.abs(q.player.z-18);clear();check('Diagonal input does not exceed normal top speed',diag<straight*1.04,{diag,straight});
place(0,0,18);q.press('Space');let max=0;for(let i=0;i<65;i++){step(1);max=Math.max(max,q.player.y)}q.release('Space');check('Full jump lands and reaches the intended height',max>1.8&&max<2.2&&q.player.grounded,{max});
place(0,0,18);tap('Space',2);let short=q.player.y;for(let i=0;i<60;i++){step(1);short=Math.max(short,q.player.y)}check('Releasing Space produces a lower jump',short<max*.75,{short,max});
place(0,0,18);q.press('Space');step(16);q.release('Space');step(1);let vy=q.player.vy;tap('Space');check('Air jump unavailable before the River Bell',q.player.jumps===1&&q.player.vy<vy);
step(80);q.press('Escape');check('Escape pauses the game',q.state==='paused');let z=q.player.z;step(60);check('Simulation remains paused',q.player.z===z);q.press('Escape');check('Escape resumes',q.state==='playing');q.press('Tab');check('Tab opens atlas and journal',q.state==='map');q.press('Tab');check('Tab returns to play',q.state==='playing');
place(0,0,4.6);q.interact();check('Moss opens dialogue',q.state==='dialogue');endDialog();check('Story conversation advances objective',q.data.flags.metMoss&&q.state==='playing');
place(5.8,0,2.1);q.press('KeyE');q.press('KeyW');step(75);clear();step(4);check('Pushing the crate solves the workshop without teleporting the crate',q.data.flags.workshop,{crate:q.world.crates[0],player:info()});
place(8,0,-4);q.press('KeyD');step(40);clear();step(8);check('Workshop gate physically opens',q.player.x>11.5,info());
place(14,0,-2.1);q.interact();check('Workshop chest awards the Sunring',q.data.ring&&q.state==='reward');endDialog();check('Reward closes back to the world',q.state==='playing');
// Props and currency.
place(10.6,0,7.8);let oldcoins=q.data.totalAcorns;tap('KeyJ');step(50);check('Blade input runs without blocking simulation',q.state==='playing'&&q.player.attackCD===0);
place(0,0,18);q.press('KeyJ');step(44);q.release('KeyJ');step(1);check('Holding and releasing attack creates a charged spin',q.player.spin>.35);step(50);
// Normal enemy attack rules, with controlled encounter placement.
q.load('brook',[0,0,19]);step(3);let e=q.world.enemies.find(e=>e.type==='beetle');check('Brookfall includes an armored beetle',!!e);let ex=e.x,ez=e.z,ey=e.y;e.angle=0;place(ex,ey,ez+1.8);e.angle=0;e.stun=0;let hp=e.hp;q.attack(false);check('Frontal blade is blocked by beetle armor',e.hp===hp,{hp,eHP:e.hp});step(25);e.angle=0;place(e.x,e.y,e.z+3);q.player.angle=Math.PI;q.throw();step(30);check('Sunring stuns and damages beetle',e.stun>0&&e.hp<hp,{stun:e.stun,hp:e.hp});
place(e.x,e.y,e.z+1.5);q.attack(false);step(25);check('A stunned beetle can be damaged by the blade',e.dead||e.hp<hp-1,{hp:e.hp,dead:e.dead});
// Switches must be struck by a real flying ring.
for(let s of q.world.switches){place(s.x,s.y,s.z+2);q.player.invuln=999;q.player.angle=Math.PI;step(180);for(let tries=0;tries<5&&!s.on;tries++){q.throw();step(130);}check('Real Sunring hits '+s.id,s.on,{on:s.on,player:info()});}
check('All runes raise a traversable physical bridge',q.data.flags.brookBridge&&q.floorAt(0,-17,1.1)?.id==='brook-bridge');
let bell=q.world.items.find(o=>o.kind==='bell');place(bell.x,2,bell.z+1.6);q.interact();check('River Bell grants Windstep',q.data.bells[0]&&q.data.airjump&&q.state==='reward');endDialog();
place(0,2,-33);q.press('Space');step(20);q.release('Space');step(1);q.press('Space');step(3);check('Unlocked air jump resets upward velocity',q.player.jumps===2&&q.player.vy>8,{vy:q.player.vy});q.release('Space');step(100);
// Moving platforms carry the grounded player.
let m=q.world.moving[0];place(m.x,m.y,m.z);step(2);let px=q.player.x,pz=q.player.z,mx=m.x,mz=m.z;step(60);check('Moving platform carries its passenger',Math.hypot(q.player.x-px-(m.x-mx),q.player.z-pz-(m.z-mz))<.1&&q.player.floorId===m.id,{player:info(),platform:m.id});
// Fall recovery retains collection.
q.player.hp=q.player.maxHp;let coins=q.data.coins;place(70,-4,70);step(20);check('Falling returns to a lantern and preserves currency',q.player.y>-1&&q.data.coins===coins&&q.data.stats.falls>0,info());
q.settings.assist=true;let health=q.player.hp;place(70,-4,70);step(20);check('Gentle mode removes fall damage',q.player.hp===health);q.settings.assist=false;
// Platform collectibles and bell progression.
q.load('sun',[0,0,19]);step(2);for(let o of q.world.items.filter(o=>o.kind==='spindle')){place(o.x,o.y-.8,o.z);step(12);check('Collectible wind spindle '+o.id,o.gone,{y:o.y,player:info()});}
let sky=q.world.items.find(o=>o.kind==='bell');place(sky.x,7.3,sky.z+1.6);q.interact();check('Sky Bell grants empowered charged spin',q.data.bells[1]&&q.data.empowered&&q.state==='reward');endDialog();
q.load('moon',[0,0,19]);step(2);let thorn=q.world.thorns[0];place(thorn.x,thorn.y,thorn.z+2.8);q.player.angle=Math.PI;q.attack(false);check('Dark brambles resist ordinary swings',!thorn.broken);step(25);q.press('KeyJ');step(43);q.release('KeyJ');step(1);check('Empowered charged spin destroys dark brambles',thorn.broken);
for(let p of q.world.prisms){place(p.x,0,p.z+1.6);let safe=0;while(p.dir!==p.want&&safe++<5){q.interact();step(1)}check('Interactive prism rotates to its correct bearing '+p.id,p.dir===p.want);}
check('Complete prism path activates the Moon Bell',q.data.flags.moonSolved);let moon=q.world.items.find(o=>o.kind==='bell');place(moon.x,1.1,moon.z+1.6);q.interact();check('Third bell completes core region progression',q.data.bells.every(Boolean)&&q.state==='reward');endDialog();
// Shop and persistence.
q.load('hearth',[0,0,16]);q.data.coins=200;q.openShop();let maxhp=q.player.maxHp;q.buy('heart');check('Heart vessel spends exactly its price and adds a heart',q.data.coins===180&&q.player.maxHp===maxhp+2);q.buy('sash');check('Traveler sash purchase persists',q.data.flags.sash&&q.data.coins===155);q.buy('longRing');check('Long ring purchase persists',q.data.flags.longRing&&q.data.coins===125);q.buy('longRing');check('Duplicate equipment cannot be charged twice',q.data.coins===125);document.getElementById('shopClose').click();check('Shop closes to gameplay',q.state==='playing');q.save();let clone=q.validate(JSON.parse(JSON.stringify(q.data)));check('Progress serializes and validates with equipment and bells intact',clone.bells.every(Boolean)&&clone.flags.sash&&clone.empowered&&clone.airjump);
let rejects=false;try{q.validate({version:9000})}catch{rejects=true}check('Incompatible save file is rejected',rejects);
// All six secrets and one-time sidequest reward.
for(let region of ['hearth','brook','hollow','sun','moon']){q.load(region);for(let o of q.world.items.filter(o=>o.kind==='moth')){place(o.x,o.y-.8,o.z);step(5);}}
check('Six distinct moth secrets are collectible',q.data.moths.length===6,{moths:q.data.moths});q.load('hearth',[-16,0,-2.5]);step(3);let before=q.player.maxHp;q.interact();endDialog();endDialog();check('Pip rewards completion with a permanent heart',q.data.flags.mothReward&&q.player.maxHp===before+2);q.interact();endDialog();check('Pip reward cannot be repeated',q.player.maxHp===before+2);
// Boss gate and true combat damage, diagnostic placement only.
q.load('crown',[0,0,5]);step(3);let b=q.world.boss;check('Final guardian wakes as the player enters',b.awakened&&b.mode==='charge');place(0,0,-2);q.attack();check('Boss cannot take blade damage while armored',b.hp===18);
q.player.invuln=999;let combat=[];for(let cycle=0;cycle<6&&q.world.boss;cycle++){
 b=q.world.boss;place(0,0,3);q.player.invuln=999;let frames=0;while(q.world.boss&&b.mode!=='open'&&frames++<1000)step(1);
 if(b.mode!=='open')break;q.throw();step(30);check('Boss eye opening can be stunned by the actual ring, cycle '+cycle,b.mode==='stunned',{mode:b.mode,hp:b.hp});place(0,0,-2);q.player.invuln=999;
 for(let k=0;k<4&&q.world.boss&&q.world.boss.mode==='stunned';k++){q.attack(false);step(26)}combat.push(q.world.boss?.hp||0);
}
check('Guardian requires multiple vulnerability windows',combat.length>=3,{healthAfterWindows:combat});check('Winning triggers the original ending dialogue',q.data.won&&q.state==='dialogue');endDialog();check('Ending screen is reachable through real attacks',q.state==='ending');document.querySelector('#ending button').click();
check('Postgame exploration returns to the village',q.state==='transition'||q.room==='hearth');
return{tests,passed:tests.filter(t=>t.passed).length,failed:tests.filter(t=>!t.passed),diagnostics:Bramblebound.diagnostics()};
}
