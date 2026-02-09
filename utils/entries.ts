import { DetailSocialFeedEntry, RawDetailEntry, RawEntry, SocialFeedEntry } from '@/types/entry';
import { Profile } from '@/types/profile';

export function transformSocialFeedEntries(
  rawEntries: RawEntry[],
  profiles: Profile[]
): SocialFeedEntry[] {
  // entry에 프로필 정보 병합
  const enrichedEntries = rawEntries
    .map((entry) => {
      const userProfile = profiles.find((p) => p.id === entry.user_books.user_id);
      if (!userProfile) return null;
      return {
        entry: {
          id: entry.id,
          date: entry.date,
          from_page: entry.from_page,
          to_page: entry.to_page,
          summary: entry.summary,
          is_private: false,
          book: entry.user_books.books,
          created_at: entry.created_at ?? entry.date,
        },
        profile: userProfile,
      };
    })
    .filter((e): e is SocialFeedEntry => e !== null);

  return enrichedEntries;
}

export function transformDetailSocialFeedEntries(
  rawEntries: RawDetailEntry[],
  profiles: Profile[],
  user_id: string
): DetailSocialFeedEntry[] {
  // entry에 프로필 정보 병합
  const enrichedEntries = rawEntries
    .map((entry) => {
      const userProfile = profiles.find((p) => p.id === entry.user_books.user_id);
      if (!userProfile) return null;

      const isLiked = entry.likes?.some((like) => like.user_id === user_id) ?? false;
      const likeCount = entry.likes?.length ?? 0;

      return {
        entry: {
          id: entry.id,
          date: entry.date,
          from_page: entry.from_page,
          to_page: entry.to_page,
          summary: entry.summary,
          is_private: false,
          book: entry.user_books.books,
          created_at: entry.created_at ?? entry.date,
        },
        profile: userProfile,
        initialLiked: isLiked,
        initialLikeCount: likeCount,
      };
    })
    .filter((e): e is DetailSocialFeedEntry => e !== null);

  return enrichedEntries;
}
