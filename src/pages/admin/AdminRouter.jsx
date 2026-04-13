import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import ProgramSelectPage from './ProgramSelectPage'
import SettingsPage from './SettingsPage'
import ManagementPage from './ManagementPage'
import NoticePage from './NoticePage'
import InquiryPage from './InquiryPage'
import CompanyUserPage from './CompanyUserPage'
import VideoDashboardPage from './VideoDashboardPage'

export default function AdminRouter() {
  return (
    <Routes>
      <Route path="/" element={<ProgramSelectPage />} />
      <Route path=":progId" element={<AdminLayout />}>
        <Route index element={<Navigate to="settings" replace />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="management/*" element={<ManagementPage />} />
        <Route path="video-dashboard" element={<VideoDashboardPage />} />
        <Route path="companies" element={<CompanyUserPage />} />
        <Route path="notice/*" element={<NoticePage />} />
        <Route path="inquiry/*" element={<InquiryPage />} />
      </Route>
    </Routes>
  )
}
