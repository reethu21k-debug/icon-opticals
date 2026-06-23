export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerClientInstance } from '@/lib/supabase'
import AdminSidebar from '@/components/admin/AdminSidebar'

interface AdminProfile {
  role: string | null
  full_name: string | null
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login?redirect=/admin')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const adminProfile = profile as AdminProfile | null

  if (adminProfile?.role !== 'admin') {
    redirect('/')
  }

  const computedAdminName = adminProfile?.full_name || user.email || 'Authorized User'

  return (
    // ── This div sits inside the root layout's <div className="pt-[104px]">.
    // ── We use a negative margin-top to cancel that offset so the admin panel
    // ── fills the full viewport with no gap from the (now hidden) main navbar.
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50/50 via-white to-rose-50/20 flex relative selection:bg-slate-900 selection:text-white font-sans overflow-hidden"
      style={{ marginTop: '-104px' }}
    >
      
      {/* ── Global Ambient Background Orbs ── */}
      <div className="fixed top-[-10%] left-[-10%] w-[45rem] h-[45rem] bg-rose-200/20 rounded-full blur-[120px] animate-float pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[45rem] h-[45rem] bg-slate-200/40 rounded-full blur-[120px] animate-float-delayed pointer-events-none z-0" />

      {/* ── Fixed Architectural Admin Sidebar ── */}
      <AdminSidebar userName={computedAdminName} />
      
      {/* ── Main Content ── */}
      {/* 
        On mobile: pt-16 gives 64px top padding so content clears the
        AdminSidebar's mobile toggle button (which is now at top-4).
        On desktop (lg+): pt-10 is fine since the sidebar is always visible.
      */}
      <main className="flex-1 min-w-0 p-0 ml-0 lg:ml-64 xl:ml-72 transition-all duration-500 relative z-10 h-screen overflow-y-auto custom-scrollbar scroll-smooth">
        <div className="min-h-full p-6 sm:p-10 lg:p-12 pt-16 lg:pt-10">
          {children}
        </div>
      </main>

      {/* ── Global Admin Styles ── */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Hide root-layout Navbar and Footer inside admin */
        footer.ft,
        body header:first-of-type {
          display: none !important;
        }

        @keyframes float { 
          0%, 100% { transform: translateY(0) scale(1); } 
          50% { transform: translateY(-20px) scale(1.05); } 
        }
        @keyframes float-delayed { 
          0%, 100% { transform: translateY(0) scale(1); } 
          50% { transform: translateY(20px) scale(0.95); } 
        }
        .animate-float { animation: float 12s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 14s ease-in-out infinite; }
        
        .custom-scrollbar::-webkit-scrollbar { 
          width: 6px; 
          height: 6px; 
        }
        .custom-scrollbar::-webkit-scrollbar-track { 
          background: transparent; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background-color: rgba(148, 163, 184, 0.25); 
          border-radius: 20px; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
          background-color: rgba(148, 163, 184, 0.5); 
        }
      `}} />
    </div>
  )
}