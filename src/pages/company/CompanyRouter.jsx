import { Routes, Route, Navigate } from 'react-router-dom'
export default function CompanyRouter() {
  return (
    <Routes>
      <Route path="*" element={<div style={{padding:32}}>기업 대시보드 (구현 예정)</div>} />
    </Routes>
  )
}
