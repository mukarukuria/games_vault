import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { session } = useAuth()
  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="muted">Signed in as {session?.user?.email}</p>
      <p>Dashboard content arrives in Chunk 3.</p>
    </div>
  )
}