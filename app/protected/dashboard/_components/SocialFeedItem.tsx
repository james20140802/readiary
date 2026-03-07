'use client';

import { useState, useRef, useEffect } from 'react';
import { SocialFeedEntry } from '@/types/entry';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import Card from '@/components/ui/Card';
import { formatDistance } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { MoreHorizontal, Heart, User, BookOpen, Maximize2 } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { getImageUrl } from '@/utils/profile';

export default function FeedItem({ entry, profile, initialLiked }: SocialFeedEntry) {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const timeZone = 'Asia/Seoul';
  const now = toZonedTime(new Date(), timeZone);
  const targetDate = toZonedTime(new Date(entry.created_at), timeZone);

  const userProfilePath = `/protected/social/u/${profile.nickname}-${profile.tag}`;
  const bookDetailPath = `${userProfilePath}/books/${entry.book.id}`;
  const entryDetailPath = `${userProfilePath}/entry/${entry.id}`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLikeLoading) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert('로그인이 필요한 기능입니다.');
      return;
    }

    const previousState = isLiked;
    setIsLiked(!previousState);
    setIsLikeLoading(true);

    try {
      if (!previousState) {
        const { error } = await supabase
          .from('likes')
          .insert({ entry_id: entry.id, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .delete()
          .match({ entry_id: entry.id, user_id: user.id });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Like error:', error);
      setIsLiked(previousState);
    } finally {
      setIsLikeLoading(false);
    }
  };

  return (
    <Card
      aria-label="소셜 피드 항목"
      className="relative flex gap-4 p-4 items-start group transition-all"
    >
      <Link href={userProfilePath} className="shrink-0 mt-0.5">
        <Avatar
          alt={`${profile.nickname}의 프로필 이미지`}
          fallbackText={profile.nickname.charAt(0).toUpperCase()}
          src={getImageUrl(profile.profile_image) || undefined}
          size="lg"
        />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1.5">
          <div className="text-sm">
            <Link
              href={userProfilePath}
              className="font-bold text-label dark:text-label-invert hover:underline"
            >
              {profile.name}
            </Link>
            <span className="text-label-muted ml-1">님이</span>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 text-label-muted hover:text-label-sub dark:hover:text-label-muted rounded-md transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                <button
                  onClick={() => router.push(userProfilePath)}
                  className="flex items-center gap-2 w-full px-3.5 py-2 hover:bg-surface-raised dark:hover:bg-dark-raised text-left text-[13px] font-medium transition-colors text-label dark:text-label-invert"
                >
                  <User size={14} className="text-label-muted" /> 프로필 방문
                </button>
                <button
                  onClick={() => router.push(bookDetailPath)}
                  className="flex items-center gap-2 w-full px-3.5 py-2 hover:bg-surface-raised dark:hover:bg-dark-raised text-left text-[13px] font-medium transition-colors text-label dark:text-label-invert"
                >
                  <BookOpen size={14} className="text-label-muted" /> 책 보기
                </button>
                <button
                  onClick={() => router.push(entryDetailPath)}
                  className="flex items-center gap-2 w-full px-3.5 py-2 hover:bg-surface-raised dark:hover:bg-dark-raised text-left text-[13px] font-medium transition-colors text-label dark:text-label-invert"
                >
                  <Maximize2 size={14} className="text-label-muted" /> 기록 보기
                </button>
              </div>
            )}
          </div>
        </div>

        <Link href={bookDetailPath} className="flex items-center gap-1.5 mb-2 group/book">
          <BookOpen size={12} className="text-label-muted" />
          <span className="text-xs text-label-muted group-hover/book:text-tint transition-colors truncate">
            {entry.book.title}
          </span>
        </Link>

        <Link href={entryDetailPath}>
          <p className="text-sm text-label-sub dark:text-label-muted leading-relaxed line-clamp-3 hover:text-label dark:hover:text-label-invert transition-colors">
            {entry.summary}
          </p>
        </Link>

        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px] text-label-muted tabular-nums">
            {formatDistance(targetDate, now, { addSuffix: true, locale: ko })}
          </span>
          <button
            onClick={handleLike}
            disabled={isLikeLoading}
            className={`flex items-center gap-1 text-xs transition-colors ${
              isLiked ? 'text-danger' : 'text-label-muted hover:text-danger'
            }`}
          >
            <Heart size={13} fill={isLiked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </Card>
  );
}
