import { Head } from '@inertiajs/react';

export default function Welcome() {
    return (
        <>
            <Head title="Steam Backlog" />
            <div className="flex min-h-screen flex-col items-center justify-center bg-[#1b2838] p-6 text-[#c7d5e0]">
                <main className="w-full max-w-lg text-center">
                    <h1 className="mb-3 text-3xl font-semibold text-white">
                        Steam Backlog
                    </h1>
                    <p className="text-[#8f98a0]">
                        Triage your Steam library. Manage your real backlog.
                    </p>
                </main>
            </div>
        </>
    );
}
