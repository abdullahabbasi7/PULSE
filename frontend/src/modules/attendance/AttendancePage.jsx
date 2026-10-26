// M3 · Face Attendance — owner: Atiqa Jabeen
import { ModulePlaceholder } from '../ModulePlaceholder.jsx'

export function AttendancePage() {
  return (
    <ModulePlaceholder
      code="M3"
      owner="Atiqa"
      title="Staff & Attendance"
      description="Register staff faces once, then mark attendance by camera at the venue or office."
      features={[
        'Staff profiles with role, phone and daily wage',
        'Face registration from a few webcam photos',
        'Check-in / check-out by face match with time and event',
        'Daily attendance sheet and absentee list',
      ]}
    />
  )
}
