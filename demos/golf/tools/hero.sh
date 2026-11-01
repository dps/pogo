#!/bin/zsh
# The launcher image: Old Grumble watching a plant lunge at the ball.
SP=${TMPDIR:-/tmp}
export PATH=$SP/node/bin:$PATH
cd "$(dirname "$0")/.."
OUT=${1:-shots/hero.png}
node ../../bin/pogo.js shot . --device desktop --dpr 2 --out $OUT --steps 2 --eval "
const G=()=>globalThis.__golf;game.go('play',{hole:26});game.step(30);const r=G();r.endIntro();game.step(10);
const s=r.sim,p=r.c.plants[0];
r.camera=()=>{};r.syncBall=()=>{};r.flagMark=()=>{};r.drawUI=(d)=>{const v=r.s.view,c=r.sticker,y=v.height*0.17,z=v.height/7.6,x=v.width*0.25;c(d,'CRAZY',x,y,z*0.82,'#ffe36b','#3a0f2e',{w:0.1,rot:-0.03});c(d,'PUTT',x,y+z*0.92,z*1.45,'#ffffff','#3a0f2e',{w:0.1,rot:-0.03});c(d,'VOLCANO',x,y+z*2,z,'#ff7a3c','#3a0f2e',{w:0.1,rot:-0.03});};
for(const b of r.buttons)b.destroy();r.btnChip={};r.btnView={};r.btnMenu={};
s.t=p.period*0.1;
const px=p.x-1.6,pz=p.z+1.7,by=p.y+1.05;
r.ball.pos.set(px+0.4,by-0.05,pz-0.1);r.ball.rot.set(0.3,0.5,0.2);r.ball.scale.set(1.4,1.4,1.4);r.blob.pos.set(px+0.4,p.y+0.02,pz-0.1);r.blob.scale.set(1.6,1,1.6);
s.x=px;s.z=pz;
for(let i=0;i<70;i++){const u=i/70;r.trail.push([px-3.6+u*4,by-1.4+Math.sin(u*2.6)*1.6,pz+3-u*3]);}
r.update=()=>{r.stage.update(1/60);};
const E=r.stage.plantE[0];E.open=1.1;E.yaw=Math.atan2(px-p.x,pz-p.z);
game.current.cam3.fov=52;game.current.cam3.pos.set(p.x-0.4,p.y+2.3,p.z+7.6);game.current.cam3.target.set(p.x-2,p.y+2.5,p.z-0.5);
r.stage.update(1/60);E.open=1.1;
"
