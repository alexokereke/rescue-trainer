'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, RoundedBox } from '@react-three/drei'
import { useRef, useState, useEffect } from 'react'
import * as THREE from 'three'

function Model({ pressing, depthRef }: { pressing: boolean, depthRef?: React.MutableRefObject<number> }) {
  const chest = useRef<THREE.Group>(null!)
  const hands = useRef<THREE.Group>(null!)
  useFrame((state, d) => {
    const depth = depthRef ? depthRef.current : (pressing ? 1 : 0)
    if (chest.current) chest.current.scale.y = THREE.MathUtils.damp(chest.current.scale.y, 1 - depth * 0.28, 18, d)
    if (hands.current) hands.current.position.y = THREE.MathUtils.damp(hands.current.position.y, 1.05 - depth * 0.35, 18, d)
    if (hands.current) hands.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05
  })
  return (
    <group position={[0, -0.4, 0]}>
      <mesh position={[0, -0.65, 0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[10,10]}/><meshStandardMaterial color="#e7e0d3"/></mesh>
      <RoundedBox args={[3.4, 1.1, 4.2]} radius={0.45} position={[0,0,0]}><meshStandardMaterial color="#e8b08e" roughness={0.6}/></RoundedBox>
      <group ref={chest}><mesh position={[0,0.58,0.3]}><cylinderGeometry args={[0.5,0.5,0.1,32]}/><meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.7}/></mesh></group>
      <mesh position={[0,0.35,2.6]}><sphereGeometry args={[0.55,32,32]}/><meshStandardMaterial color="#e8b08e"/></mesh>
      {/* Animated hands pressing */}
      <group ref={hands} position={[0,1.05,0.3]}>
        <RoundedBox args={[0.9,0.25,1.1]} radius={0.1}><meshStandardMaterial color="#d99a6c"/></RoundedBox>
        <RoundedBox args={[0.85,0.22,1]} radius={0.1} position={[0,0.22,0]}><meshStandardMaterial color="#c98a5b"/></RoundedBox>
      </group>
      {/* Arms */}
      <mesh position={[-0.8,1.4,0.3]} rotation={[0,0,0.5]}><cylinderGeometry args={[0.16,0.16,1.6,16]}/><meshStandardMaterial color="#2563eb"/></mesh>
      <mesh position={[0.8,1.4,0.3]} rotation={[0,0,-0.5]}><cylinderGeometry args={[0.16,0.16,1.6,16]}/><meshStandardMaterial color="#2563eb"/></mesh>
    </group>
  )
}

export default function Chest3D() {
  const [count, setCount] = useState(0)
  const [running, setRunning] = useState(false)
  const [pressing, setPressing] = useState(false)

  useEffect(() => {
    if (!running) return
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
      speechSynthesis.speak(new SpeechSynthesisUtterance('Push hard and fast in the centre of the chest. Follow the beat. Allow full recoil.'))
    }
    const id = setInterval(() => {
      setPressing(true); setCount(c => c + 1); setTimeout(() => setPressing(false), 180)
    }, 60000/110)
    return () => clearInterval(id)
  }, [running])

  return (
    <div>
      <div style={{height:420,background:'#f4f1ea',borderRadius:20,overflow:'hidden',border:'1px solid #ddd',position:'relative'}}>
        <Canvas camera={{position:[3.5,3,5],fov:45}}><ambientLight intensity={1.4}/><directionalLight position={[4,6,4]} intensity={1.6}/><Model pressing={pressing}/><OrbitControls enableZoom={false}/></Canvas>
        <div style={{position:'absolute',top:12,left:12,background:'#111',color:'#fff',padding:'6px 12px',borderRadius:999,fontSize:12,fontWeight:700}}>Press the red target • {count}</div>
      </div>
      <button onClick={()=>{setRunning(!running); if(!running) setCount(0)}} style={{width:'100%',marginTop:12,padding:16,borderRadius:14,background:running?'#111':'#dc2626',color:'#fff',fontWeight:800,border:0,cursor:'pointer'}}>{running?'Pause':'Start 3D Demo + Voice'}</button>
      <p style={{color:'#444',fontSize:14}}>Drag to rotate. Hands press at 110 BPM — about 5cm deep. Practise on a mannequin only.</p>
    </div>
  )
}
export { Model }