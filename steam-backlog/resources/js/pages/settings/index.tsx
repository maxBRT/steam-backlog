import { FormEvent, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { User } from '@/types/auth';
import { cn } from '@/lib/utils';

interface SettingsPageProps {
    user: User;
}

export default function SettingsIndex() {
    const { user } = usePage<SettingsPageProps>().props;
    const [syncFrequency, setSyncFrequency] = useState(user.sync_frequency);
    const [privacyPrefs, setPrivacyPrefs] = useState(
        user.privacy_preferences || {
            show_profile: true,
            show_playtime: true,
            share_activity: true,
        }
    );
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSyncFrequencySubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        router.post(
            '/settings/sync-frequency',
            { sync_frequency: syncFrequency },
            {
                onFinish: () => setIsSubmitting(false),
            }
        );
    };

    const handlePrivacySubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        router.post(
            '/settings/privacy',
            { privacy_preferences: privacyPrefs },
            {
                onFinish: () => setIsSubmitting(false),
            }
        );
    };

    const handleExportData = () => {
        window.location.href = '/settings/export';
    };

    const handleDeleteAccount = (e: FormEvent) => {
        e.preventDefault();
        if (deleteConfirmation !== 'DELETE') {
            alert('Please type DELETE to confirm account deletion.');
            return;
        }
        
        if (!confirm('Are you absolutely sure? This action cannot be undone.')) {
            return;
        }

        router.delete('/settings/account', {
            data: { confirmation: deleteConfirmation },
        });
    };

    const cardClassName = 'bg-[#16202d] border border-gray-700 rounded-lg p-6';
    const headingClassName = 'text-xl font-semibold text-[#c7d5e0] mb-4';
    const labelClassName = 'block text-sm font-medium text-[#c7d5e0] mb-2';
    const descriptionClassName = 'text-sm text-[#8f98a0] mb-4';
    const buttonClassName =
        'px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    const primaryButtonClassName = cn(
        buttonClassName,
        'bg-[#5c7e10] text-white hover:bg-[#6d9515]'
    );
    const dangerButtonClassName = cn(
        buttonClassName,
        'bg-red-600 text-white hover:bg-red-700'
    );

    return (
        <AppLayout>
            <Head title="Account Settings" />
            
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-[#c7d5e0]">Account Settings</h1>

                <div className={cardClassName}>
                    <h2 className={headingClassName}>Sync Frequency</h2>
                    <p className={descriptionClassName}>
                        Choose how often your Steam library should be automatically synced.
                    </p>
                    <form onSubmit={handleSyncFrequencySubmit} className="space-y-4">
                        <div>
                            <label className={labelClassName}>Frequency</label>
                            <div className="space-y-2">
                                <label className="flex items-center space-x-2 text-[#c7d5e0]">
                                    <input
                                        type="radio"
                                        name="sync_frequency"
                                        value="manual"
                                        checked={syncFrequency === 'manual'}
                                        onChange={(e) => setSyncFrequency(e.target.value as User['sync_frequency'])}
                                        className="text-[#5c7e10] focus:ring-[#5c7e10]"
                                    />
                                    <span>Manual - Only sync when I trigger it</span>
                                </label>
                                <label className="flex items-center space-x-2 text-[#c7d5e0]">
                                    <input
                                        type="radio"
                                        name="sync_frequency"
                                        value="daily"
                                        checked={syncFrequency === 'daily'}
                                        onChange={(e) => setSyncFrequency(e.target.value as User['sync_frequency'])}
                                        className="text-[#5c7e10] focus:ring-[#5c7e10]"
                                    />
                                    <span>Daily - Sync once per day</span>
                                </label>
                                <label className="flex items-center space-x-2 text-[#c7d5e0]">
                                    <input
                                        type="radio"
                                        name="sync_frequency"
                                        value="weekly"
                                        checked={syncFrequency === 'weekly'}
                                        onChange={(e) => setSyncFrequency(e.target.value as User['sync_frequency'])}
                                        className="text-[#5c7e10] focus:ring-[#5c7e10]"
                                    />
                                    <span>Weekly - Sync once per week</span>
                                </label>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting || syncFrequency === user.sync_frequency}
                            className={primaryButtonClassName}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Sync Frequency'}
                        </button>
                    </form>
                </div>

                <div className={cardClassName}>
                    <h2 className={headingClassName}>Privacy Preferences</h2>
                    <p className={descriptionClassName}>
                        Control what information is visible to others.
                    </p>
                    <form onSubmit={handlePrivacySubmit} className="space-y-4">
                        <div className="space-y-3">
                            <label className="flex items-center space-x-2 text-[#c7d5e0]">
                                <input
                                    type="checkbox"
                                    checked={privacyPrefs.show_profile ?? true}
                                    onChange={(e) =>
                                        setPrivacyPrefs({ ...privacyPrefs, show_profile: e.target.checked })
                                    }
                                    className="rounded text-[#5c7e10] focus:ring-[#5c7e10]"
                                />
                                <span>Show my profile publicly</span>
                            </label>
                            <label className="flex items-center space-x-2 text-[#c7d5e0]">
                                <input
                                    type="checkbox"
                                    checked={privacyPrefs.show_playtime ?? true}
                                    onChange={(e) =>
                                        setPrivacyPrefs({ ...privacyPrefs, show_playtime: e.target.checked })
                                    }
                                    className="rounded text-[#5c7e10] focus:ring-[#5c7e10]"
                                />
                                <span>Show playtime statistics</span>
                            </label>
                            <label className="flex items-center space-x-2 text-[#c7d5e0]">
                                <input
                                    type="checkbox"
                                    checked={privacyPrefs.share_activity ?? true}
                                    onChange={(e) =>
                                        setPrivacyPrefs({ ...privacyPrefs, share_activity: e.target.checked })
                                    }
                                    className="rounded text-[#5c7e10] focus:ring-[#5c7e10]"
                                />
                                <span>Share my activity with friends</span>
                            </label>
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={primaryButtonClassName}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Privacy Preferences'}
                        </button>
                    </form>
                </div>

                <div className={cardClassName}>
                    <h2 className={headingClassName}>Export Data</h2>
                    <p className={descriptionClassName}>
                        Download a copy of your account data in JSON format.
                    </p>
                    <button onClick={handleExportData} className={primaryButtonClassName}>
                        Export My Data
                    </button>
                </div>

                <div className={cardClassName}>
                    <h2 className={cn(headingClassName, 'text-red-500')}>Delete Account</h2>
                    <p className={descriptionClassName}>
                        Permanently delete your account and all associated data. This action cannot be
                        undone.
                    </p>
                    <form onSubmit={handleDeleteAccount} className="space-y-4">
                        <div>
                            <label className={labelClassName}>
                                Type <strong>DELETE</strong> to confirm:
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmation}
                                onChange={(e) => setDeleteConfirmation(e.target.value)}
                                className="w-full px-3 py-2 bg-[#0e1419] border border-gray-700 rounded-md text-[#c7d5e0] focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="DELETE"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={deleteConfirmation !== 'DELETE'}
                            className={dangerButtonClassName}
                        >
                            Delete My Account
                        </button>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
