import Navbar from "../components/common/Navbar"
import Footer from "../components/common/Footer"

export default function MainLayout({ children, onOpenCreateModal }) {
  return (
    <div className="bg-[#0A0B0E] text-[#F8FAFC] min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Layered Background Atmosphere */}
      <div className="fixed inset-0 w-full h-full -z-20 overflow-hidden pointer-events-none">
        {/* Ambient glow pools */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#7C3AED]/15 blur-[120px]"></div>
        <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-[#38BDF8]/10 blur-[130px]"></div>
        <div className="absolute bottom-10 left-1/4 w-96 h-96 rounded-full bg-[#6366F1]/10 blur-[140px]"></div>

        {/* Cyber grid lines overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#232730_1px,transparent_1px),linear-gradient(to_bottom,#232730_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>

        {/* Gradient vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0B0E]/60 via-[#0A0B0E]/90 to-[#0A0B0E]"></div>
      </div>

      {/* Top Header */}
      <Navbar onOpenCreateModal={onOpenCreateModal} />

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-16">
        {children}
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  )
}
