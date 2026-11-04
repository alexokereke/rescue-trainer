'use client'
import { useEffect, useState } from 'react'
export default function AnimatedBackground(){
  const [y,setY]=useState(0)
  useEffect(()=>{ const fn=()=>setY(window.scrollY); window.addEventListener('scroll',fn,{passive:true}); return()=>window.removeEventListener('scroll',fn)},[])
  return(
    <div aria-hidden style={{position:'fixed',inset:0,zIndex:-1,overflow:'hidden',background:'#f6f2ea',pointerEvents:'none'}}>
      <div style={{position:'absolute',width:520,height:520,borderRadius:'50%',background:'radial-gradient(circle,#fecaca,transparent 70%)',top:-120,left:-100,transform:`translateY(${y*0.25}px)`}}/>
      <div style={{position:'absolute',width:620,height:620,borderRadius:'50%',background:'radial-gradient(circle,#bfdbfe,transparent 70%)',bottom:-200,right:-120,transform:`translateY(${-y*0.18}px)`}}/>
      <div style={{position:'absolute',inset:0,opacity:0.12,backgroundImage:'linear-gradient(#111 1px,transparent 1px),linear-gradient(90deg,#111 1px,transparent 1px)',backgroundSize:'44px 44px',transform:`translateY(${y*0.08}px)`}}/>
      <svg style={{position:'absolute',top:'18%',left:0,width:'100%',opacity:0.18,transform:`translateX(${-y*0.1}px)`}} viewBox="0 0 1200 120"><polyline fill="none" stroke="#dc2626" strokeWidth="4" points="0,60 420,60 450,20 480,100 510,60 1200,60"/></svg>
    </div>
  )
}