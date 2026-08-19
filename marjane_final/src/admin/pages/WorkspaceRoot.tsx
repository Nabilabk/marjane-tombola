import { Outlet } from 'react-router-dom'
import { WorkspaceLayout } from '../layouts/WorkspaceLayout'

export default function WorkspaceRoot() {
  return (
    <WorkspaceLayout>
      <Outlet />
    </WorkspaceLayout>
  )
}
