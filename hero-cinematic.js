/* BADAI cinematic hero: progressive MP4 and subtle pointer depth */
(function(){
 "use strict";
 const hero=document.querySelector(".hero.hero-cinematic");
 if(!hero)return;
 const scene=hero.querySelector(".hero-visual-scene");
 const video=hero.querySelector(".hero-cinematic-video");
 const reduceMotion=window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
 const slowConnection=connection&&(connection.saveData||["slow-2g","2g"].includes(connection.effectiveType));
 if(scene&&!reduceMotion&&window.matchMedia("(hover:hover) and (pointer:fine)").matches){
   let raf=0;
   scene.addEventListener("pointermove",function(event){
     if(raf)return;
     const rect=scene.getBoundingClientRect();
     const x=(event.clientX-rect.left)/rect.width-.5;
     const y=(event.clientY-rect.top)/rect.height-.5;
     raf=window.requestAnimationFrame(function(){
       scene.style.setProperty("--hero-tilt-x",(-y*2.7).toFixed(2)+"deg");
       scene.style.setProperty("--hero-tilt-y",(x*3.5).toFixed(2)+"deg");
       raf=0;
     });
   },{passive:true});
   scene.addEventListener("pointerleave",function(){
     scene.style.setProperty("--hero-tilt-x","0deg");
     scene.style.setProperty("--hero-tilt-y","0deg");
   },{passive:true});
 }
 if(!video||reduceMotion||slowConnection)return;
 let loaded=false,visible=false;
 video.addEventListener("playing",()=>hero.classList.add("is-video-playing"));
 video.addEventListener("pause",()=>hero.classList.remove("is-video-playing"));
 video.addEventListener("error",()=>hero.classList.remove("is-video-playing"));
 function start(){
   if(!visible||document.hidden)return;
   if(!loaded){
     loaded=true;
     video.src=video.dataset.src;
     video.load();
   }
   const playing=video.play();
   if(playing&&typeof playing.catch==="function")playing.catch(function(){hero.classList.remove("is-video-playing")});
 }
 if("IntersectionObserver" in window){
   const observer=new IntersectionObserver(function(entries){
     visible=entries[0].isIntersecting;
     if(visible)start();
     else{video.pause();hero.classList.remove("is-video-playing")}
   },{rootMargin:"70px 0px",threshold:0});
   observer.observe(hero);
 }else{visible=true;start()}
 document.addEventListener("visibilitychange",function(){
   if(document.hidden){video.pause();hero.classList.remove("is-video-playing")}
   else start();
 });
})();
