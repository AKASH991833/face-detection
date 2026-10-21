/* FaceTrace - tiny_face_detector + 68 landmarks, webcam & images, all local. */
(()=>{
const $=s=>document.querySelector(s);
const stage=$('#stage');
let stream=null,video=null,canvas=null,ctx=null,img=null,running=false,lastT=0,fps=0;
let detOpts=null;
async function loadModels(){
  $('#st-model').textContent='loading...';
  await faceapi.nets.tinyFaceDetector.loadFromUri('./weights');
  await faceapi.nets.faceLandmark68Net.loadFromUri('./weights');
  detOpts=new faceapi.TinyFaceDetectorOptions({inputSize:416,scoreThreshold:0.4});
  $('#st-model').textContent='tiny-yolo v1';
}
function setStage(node){
  stage.innerHTML='';
  canvas=document.createElement('canvas');canvas.className='overlay';
  stage.append(node,canvas);ctx=canvas.getContext('2d');
}
function fitOverlay(w,h){canvas.width=w;canvas.height=h;}
async function detectLoop(){
  if(!running)return;
  const src=video||img;
  if(src&&(video?video.readyState>=2:true)){
    const w=video?video.videoWidth:img.naturalWidth,h=video?video.videoHeight:img.naturalHeight;
    if(canvas.width!==w)fitOverlay(w,h);
    const t0=performance.now();
    let dets=await faceapi.detectAllFaces(src,detOpts);
    if($('#tLand').checked)dets=await faceapi.detectAllFaces(src,detOpts).withFaceLandmarks();
    const ms=performance.now()-t0;
    const now=performance.now();
    if(lastT){fps=fps*0.85+1000/(now-lastT)*0.15;}
    lastT=now;
    ctx.clearRect(0,0,w,h);
    drawDets(dets,w,h);
    $('#st-faces').textContent=dets.length;
    $('#st-ms').textContent=Math.round(ms);
    $('#st-fps').textContent=video?fps.toFixed(0):'still';
    renderFaceList(dets,src,w,h);
  }
  if(video)setTimeout(()=>requestAnimationFrame(detectLoop),90);
}
function drawDets(dets,w,h){
  ctx.lineWidth=Math.max(2,w/480);
  dets.forEach(d=>{
    const b=d.detection.box;
    if($('#tBox').checked){
      const g=ctx.createLinearGradient(b.x,b.y,b.x+b.width,b.y+b.height);
      g.addColorStop(0,'#be185d');g.addColorStop(1,'#f472b6');
      ctx.strokeStyle=g;
      const r=Math.min(12,b.width/6);
      // corner brackets
      ctx.beginPath();
      [[b.x,b.y,1,1],[b.x+b.width,b.y,-1,1],[b.x,b.y+b.height,1,-1],[b.x+b.width,b.y+b.height,-1,-1]].forEach(([x,y,dx,dy])=>{
        ctx.moveTo(x+dx*r,y);ctx.lineTo(x,y);ctx.lineTo(x,y+dy*r);});
      ctx.stroke();
      // confidence label
      const label=(d.detection.score*100).toFixed(0)+'%';
      ctx.font=`bold ${Math.max(13,w/46)}px system-ui`;
      const tw=ctx.measureText(label).width+14;
      ctx.fillStyle='rgba(190,24,93,.88)';
      ctx.fillRect(b.x,b.y-Math.max(20,w/34),tw,Math.max(20,w/34));
      ctx.fillStyle='#fff';
      ctx.fillText(label,b.x+7,b.y-Math.max(6,w/110));
    }
    if($('#tLand').checked&&d.landmarks){
      ctx.fillStyle='#22d3ee';
      d.landmarks.positions.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1.3,w/340),0,7);ctx.fill();});
      // jaw line
      ctx.strokeStyle='rgba(34,211,238,.55)';ctx.lineWidth=Math.max(1,w/640);
      const jaw=d.landmarks.getJawOutline();
      ctx.beginPath();jaw.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
    }
  });
}
function renderFaceList(dets,src,w,h){
  const el=$('#faces');
  if(!dets.length){el.innerHTML='<p style="font-size:13.5px;color:var(--muted)">No faces in view.</p>';return;}
  el.innerHTML='';
  dets.forEach((d,i)=>{
    const b=d.detection.box;
    const row=document.createElement('div');row.className='frow';
    row.innerHTML=`<canvas class="av" width="44" height="44"></canvas>
      <div class="meta"><b>Face ${i+1}</b><span>${Math.round(b.width)} x ${Math.round(b.height)} px · center (${Math.round(b.x+b.width/2)}, ${Math.round(b.y+b.height/2)})</span></div>
      <span class="conf">${(d.detection.score*100).toFixed(1)}%</span>`;
    const c=row.querySelector('canvas').getContext('2d');
    const pad=b.width*0.35;
    try{c.drawImage(src,Math.max(0,b.x-pad),Math.max(0,b.y-pad),b.width+2*pad,b.height+2*pad,0,0,44,44);}catch(e){}
    el.append(row);
  });
}
async function startCam(){
  if(stream){stopCam();return;}
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280}},audio:false});
  }catch(e){toast('Camera blocked - allow camera access, or upload a photo');return;}
  video=document.createElement('video');video.autoplay=true;video.muted=true;video.playsInline=true;video.srcObject=stream;
  await new Promise(r=>video.onloadeddata=r);
  setStage(video);
  $('#camBtn').textContent='Stop webcam';
  running=true;lastT=0;detectLoop();
}
function stopCam(){
  running=false;
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
  $('#camBtn').textContent='Start webcam';
}
function loadImage(file){
  stopCam();video=null;
  const url=typeof file==='string'?file:URL.createObjectURL(file);
  img=new Image();img.crossOrigin='anonymous';
  img.onload=()=>{setStage(img);fitOverlay(img.naturalWidth,img.naturalHeight);running=true;detectLoop().then(()=>{running=false;});};
  img.onerror=()=>toast('Could not load that image');
  img.src=url;
}
$('#camBtn').onclick=startCam;
$('#file').onchange=e=>{if(e.target.files[0])loadImage(e.target.files[0]);e.target.value='';};
$('#sample1').onclick=()=>loadImage('sample-lena.jpg');
$('#sample2').onclick=()=>loadImage('sample-two.jpg');
$('#sample3').onclick=()=>loadImage('sample-group.jpg');
$('#tBox').onchange=$('#tLand').onchange=()=>{if(!video&&img)detectLoop();};
loadModels().then(()=>{loadImage('sample-lena.jpg');}).catch(e=>{
  $('#st-model').textContent='load failed';
  $('#empty').textContent='Model files failed to load - check your connection and reload.';
});
})();
