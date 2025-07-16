import { notFound } from 'next/navigation';
import { fetchProfileData } from '@/lib/queries/fetchProfileData';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileBookshelf from '@/components/profile/ProfileBookshelf';
import ProfileBadges from '@/components/profile/ProfileBadges';

export default async function FriendProfilePage({
  params,
}: {
  params: { nicknameAndTag: string };
}) {
  const [nickname, tag] = params.nicknameAndTag.split('-');
  if (!nickname || !tag) return notFound();

  const profileData = await fetchProfileData(nickname, tag);
  if (!profileData) return notFound();

  const { profile, userBooks, userBadges } = profileData;
  if (!profile) throw new Error('Profile not found');

  return (
    <main className="max-w-screen-md w-full mx-auto px-4 pt-6 pb-24">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">
          {profile.nickname}#{profile.tag}
        </h1>
        {profile.bio && <p className="text-muted-foreground mt-2">{profile.bio}</p>}
      </div>

      <section className="mb-10">
        <ProfileStats userId={profile.id} />
      </section>

      <section className="mb-10">
        <ProfileBookshelf userBooks={userBooks} />
      </section>

      <section>
        <ProfileBadges userBadges={userBadges} />
      </section>
    </main>
  );
}
