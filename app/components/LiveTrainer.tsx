'use client'
import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Model } from './Chest3D'

export default function LiveTrainer(){
  const videoRef = useRef<HTMLVideoElement>(null)
  const depthRef = useRef(0)
  const baseline = useRef<number|null>(null)
  const phase = useRef<'up'|'down'>('up')
  const lastSpeak = useRef(0)
  const [status,setStatus]=useState('Camera off')
  const [count,setCount]=useState(0)
  const [feedback,setFeedback]=useState('Enable camera. Put both hands in the circle and press up and down like CPR.')

  function say(text:string){
    const now=Date.now(); if(now-lastSpeak.current<3500) return; lastSpeak.current=now
    if('speechSynthesis' in window){ speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(text)) }
  }

  async function start(){
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false})
      if(videoRef.current){videoRef.current.srcObject=stream; await videoRef.current.play()}
      setStatus('● LIVE TRACKING'); say('Camera on. Place your hands in the centre and start compressions.')
      const {FilesetResolver,PoseLandmarker}=await import('@mediapipe/tasks-vision')
      const vision=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm')
      const pose=await PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',delegate:'GPU'},runningMode:'VIDEO',numPoses:1})
      let last=-1
      const loop=()=>{
        const v=videoRef.current; if(!v) return
        if(v.currentTime!==last){ last=v.currentTime
          const lm=pose.detectForVideo(v,performance.now()).landmarks?.[0]
          if(lm){ const y=(lm[15].y+lm[16].y)/2; const x=(lm[15].x+lm[16].x)/2
            if(baseline.current===null) baseline.current=y
            baseline.current = baseline.current*0.98 + y*0.02 // slow auto-calibrate when up
            const depth=Math.max(0,Math.min(1,(y-(baseline.current-0.02))/0.07))
            depthRef.current=depth
            if(depth>0.65 && phase.current==='up'){phase.current='down'}
            if(depth<0.2 && phase.current==='down'){phase.current='up'; setCount(c=>c+1); setFeedback('Good. Full recoil — let the chest come back up.'); say('Good compression')}
            const centered=x>0.32&&x<0.68
            if(!centered){setFeedback('Move hands to the centre of the chest.'); say('Centre your hands')}
          }
        } requestAnimationFrame(loop)}
      loop()
    }catch{setStatus('Camera blocked'); setFeedback('Allow camera permission in Chrome, or use the 3D Trainer tab.')}
  }

  return(
    <div style={{display:'grid',gap:14}}>
      <div style={{position:'relative',borderRadius:20,overflow:'hidden',background:'#111',aspectRatio:'4/3'}}>
        <video ref={videoRef} playsInline muted style={{width:'100%',height:'100%',objectFit:'cover',transform:'scaleX(-1)'}}/>
        <div style={{position:'absolute',top:12,left:12,background:'#dc2626',color:'#fff',padding:'6px 10px',borderRadius:999,fontSize:12,fontWeight:800}}>{status}</div>
        <div style={{position:'absolute',bottom:12,right:12,background:'#fff',padding:'10px 14px',borderRadius:14,fontWeight:900}}>{count} compressions</div>
        <div style={{position:'absolute',top:'50%',left:'50%',width:160,height:160,transform:'translate(-50%,-50%)',border:'3px dashed #fff',borderRadius:'50%'}}/>
      </div>
      <div>
        <p style={{fontWeight:800,margin:'0 0 8px'}}>👇 Your hands are controlling this 3D chest live:</p>
        <div style={{height:300,background:'#f4f1ea',borderRadius:20,overflow:'hidden',border:'1px solid #ddd'}}>
          <Canvas camera={{position:[3,2.8,5],fov:45}}><ambientLight intensity={1.4}/><directionalLight position={[4,6,4]} intensity={1.6}/><Model pressing={false} depthRef={depthRef}/><OrbitControls enableZoom={false}/></Canvas>
        </div>
      </div>
      <button onClick={start} style={{padding:16,borderRadius:14,background:'#2563eb',color:'#fff',fontWeight:800,border:0,cursor:'pointer'}}>Enable Camera + Live 3D</button>
      <p style={{fontWeight:700}}>{feedback}</p>
      <p style={{color:'#666',fontSize:13}}>Privacy: processed on-device only. Nothing uploaded. Voice coaching is automatic.</p>
    </div>
  )
}