// M3 · Staff & Face Attendance — owner: Atiqa Jabeen
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { PageHeader, Tabs } from '../../components/ui/index.js'
import { todayIn } from '../../lib/format.js'
import { useApi } from '../../lib/useApi.js'
import { Kiosk } from './Kiosk.jsx'
import { StaffTab } from './StaffTab.jsx'
import { TodayTab } from './TodayTab.jsx'
import { PHOTOS } from '../../components/EventPhotos.jsx'

export function AttendancePage() {
  const { user, company } = useAuth()
  const [params, setParams] = useSearchParams()
  const canKiosk = ['owner', 'manager', 'staff'].includes(user.role)
  const canManage = ['owner', 'manager'].includes(user.role)
  const canExport = ['owner', 'manager', 'accounts'].includes(user.role)
  const tab = params.get('tab') || (canKiosk ? 'kiosk' : 'today')
  const staff = useApi('/attendance/staff')
  const today = todayIn(company.timezone)

  const tabs = [
    canKiosk && { id: 'kiosk', label: 'Face check-in', icon: 'camera' },
    { id: 'today', label: 'Attendance sheet', icon: 'clock' },
    { id: 'staff', label: 'Staff', icon: 'users', count: staff.data?.length },
  ].filter(Boolean)

  return (
    <>
      <PageHeader
        context="M3 · Staff & Attendance"
        photos={[PHOTOS.hallNight, PHOTOS.archwayDay, PHOTOS.chandelierNight]}
        title="Staff & attendance"
        description="Staff check in and out by face at the office or venue. A head-turn check stops anyone using a photo."
      />
      <Tabs value={tab} onChange={(id) => setParams({ tab: id }, { replace: true })} tabs={tabs} />
      {tab === 'kiosk' && canKiosk && <Kiosk />}
      {tab === 'today' && <TodayTab today={today} staff={staff.data} canManage={canManage} canExport={canExport} />}
      {tab === 'staff' && <StaffTab staff={staff.data} setStaff={staff.setData} error={staff.error} canManage={canManage} canDelete={user.role === 'owner'} />}
    </>
  )
}
