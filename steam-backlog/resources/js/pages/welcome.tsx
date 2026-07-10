import { Head, usePage, router } from '@inertiajs/react';

type User = {
    id: number;
    steam_id: number;
    display_name: string;
    avatar_url: string;
};

type PageProps = {
    auth: {
        user: User | null;
    };
};

export default function Welcome() {
    const { auth } = usePage<PageProps>().props;

    const handleLogout = () => {
        router.post('/auth/logout');
    };

    return (
        <>
            <Head title="Steam Backlog" />
            <div className="flex min-h-screen flex-col items-center justify-center bg-[#1b2838] p-6 text-[#c7d5e0]">
                <main className="w-full max-w-lg text-center">
                    <h1 className="mb-3 text-3xl font-semibold text-white">
                        Steam Backlog
                    </h1>
                    <p className="mb-8 text-[#8f98a0]">
                        Triage your Steam library. Manage your real backlog.
                    </p>

                    {auth.user ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-center gap-4">
                                <img
                                    src={auth.user.avatar_url}
                                    alt={auth.user.display_name}
                                    className="h-16 w-16 rounded-lg"
                                />
                                <div className="text-left">
                                    <p className="text-lg font-medium text-white">
                                        {auth.user.display_name}
                                    </p>
                                    <p className="text-sm text-[#8f98a0]">
                                        Signed in with Steam
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="rounded bg-[#2a3f5f] px-6 py-3 text-white transition-colors hover:bg-[#1b2838]"
                            >
                                Sign out
                            </button>
                        </div>
                    ) : (
                        <a
                            href="/auth/steam"
                            className="inline-flex items-center gap-3 rounded bg-[#171a21] px-6 py-3 text-white transition-colors hover:bg-[#0e1116]"
                        >
                            <svg
                                className="h-6 w-6"
                                viewBox="0 0 256 259"
                                fill="currentColor"
                            >
                                <path d="M127.778 0C60.174 0 4.797 52.227.022 118.773l68.31 28.268a36.17 36.17 0 0 1 20.582-6.456c.68 0 1.348.027 2.014.068l30.36-43.985v-.619c0-26.944 21.916-48.86 48.86-48.86 26.945 0 48.86 21.916 48.86 48.86 0 26.946-21.915 48.862-48.86 48.862-.377 0-.742-.022-1.116-.028l-43.271 30.896c.038.587.063 1.173.063 1.767 0 19.944-16.225 36.17-36.17 36.17-17.705 0-32.508-12.785-35.636-29.638L.022 165.447C8.716 227.34 62.85 275.11 127.778 275.11c70.578 0 127.778-57.2 127.778-127.777C255.556 76.755 198.356 19.555 127.778 19.555v-19.556zm-55.88 200.746l-15.64-6.466c2.767 5.74 7.565 10.537 13.862 13.283 13.64 5.944 29.499-.333 35.447-13.972 2.88-6.602 2.883-13.927.01-20.532-2.873-6.603-8.27-11.746-15.195-14.478-6.88-2.763-14.154-2.385-20.472-.202l16.185 6.693c10.063 4.152 14.891 15.728 10.742 25.788-4.152 10.063-15.727 14.89-25.79 10.738l.85.148zm100.19-98.398c0-17.965-14.602-32.567-32.567-32.567-17.964 0-32.566 14.602-32.566 32.567 0 17.964 14.602 32.566 32.566 32.566 17.965 0 32.567-14.602 32.567-32.566zm-56.38 0c0-13.127 10.66-23.786 23.786-23.786s23.786 10.659 23.786 23.786c0 13.128-10.66 23.787-23.786 23.787s-23.786-10.66-23.786-23.787z" />
                            </svg>
                            Sign in with Steam
                        </a>
                    )}
                </main>
            </div>
        </>
    );
}
