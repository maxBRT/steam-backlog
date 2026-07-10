import { ReactNode } from 'react';
import { Link, usePage } from '@inertiajs/react';
import type { Auth } from '@/types/auth';

interface AppLayoutProps {
    children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    const { auth } = usePage<{ auth: Auth }>().props;

    return (
        <div className="min-h-screen bg-[#1b2838]">
            <header className="border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-8">
                            <Link href="/" className="text-xl font-bold text-[#c7d5e0]">
                                Steam Backlog
                            </Link>
                            {auth.user && (
                                <nav className="flex space-x-4">
                                    <Link
                                        href="/settings"
                                        className="text-[#8f98a0] hover:text-[#c7d5e0] transition-colors"
                                    >
                                        Settings
                                    </Link>
                                </nav>
                            )}
                        </div>
                        {auth.user && (
                            <div className="flex items-center space-x-4">
                                <img
                                    src={auth.user.avatar_url}
                                    alt={auth.user.display_name}
                                    className="w-8 h-8 rounded-full"
                                />
                                <span className="text-[#c7d5e0]">{auth.user.display_name}</span>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
