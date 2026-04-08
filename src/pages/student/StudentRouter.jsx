import { Routes, Route, Navigate } from 'react-router-dom'
export default function StudentRouter() {
  return (
    <Routes>
      <Route path="*" element={<div style={{padding:32}}>면접자 대시보드 (구현 예정)</div>} />
    </Routes>
  )
}
