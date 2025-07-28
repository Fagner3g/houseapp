import { LayoutDashboard, Rocket } from 'lucide-react'

export const data = {
  user: {
    name: 'Fagner Gomes',
    email: 'fagner.egomes@gmail.com',
    avatar: '/avatars/shadcn.jpg',
  },
  navMain: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Metas',
      url: '/goals',
      icon: Rocket,
    },
  ],
}
