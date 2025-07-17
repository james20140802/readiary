// app/protected/social/page.tsx

'use client';

import { Friend } from '@/types/friends';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SocialPage() {
  const [nicknameAndTag, setNicknameAndTag] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'friends' | 'pending'>('friends');

  useEffect(() => {
    const fetchFriends = async () => {
      const res = await fetch('/api/friends/list');
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends);
      }
    };
    fetchFriends();
  }, []);

  const sendFriendRequest = async () => {
    if (!nicknameAndTag.includes('#')) return;
    setLoading(true);
    const [nickname, tag] = nicknameAndTag.split('#');
    const res = await fetch('/api/friends/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, tag }),
    });
    if (res.ok) {
      alert('친구 요청을 보냈습니다');
      setNicknameAndTag('');
    } else {
      alert('친구 요청 실패');
    }
    setLoading(false);
  };

  const acceptFriend = async (id: string) => {
    const res = await fetch('/api/friends/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendId: id }),
    });
    if (res.ok) {
      setFriends((prev) => prev.map((f) => (f.profile.id === id ? { ...f, accepted: true } : f)));
    }
  };

  const filteredFriends =
    tab === 'friends' ? friends.filter((f) => f.accepted) : friends.filter((f) => !f.accepted);

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">👥 친구 관리</h1>

      <div className="flex items-center gap-3 mb-6">
        <input
          placeholder="닉네임#태그"
          value={nicknameAndTag}
          onChange={(e) => setNicknameAndTag(e.target.value)}
          className="border px-4 py-2 rounded-lg w-full text-sm dark:bg-gray-900 dark:text-white"
        />
        <div>
          <button
            title="친구 추가"
            onClick={sendFriendRequest}
            disabled={loading}
            className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600"
          >
            ➕
          </button>
        </div>
      </div>

      <div className="flex mb-6 border-b border-gray-300 dark:border-gray-700">
        <button
          onClick={() => setTab('friends')}
          className={`flex-1 py-2 text-center text-sm ${
            tab === 'friends'
              ? 'border-b-2 border-blue-500 font-semibold text-blue-500'
              : 'text-gray-400'
          }`}
        >
          친구 목록
        </button>
        <button
          onClick={() => setTab('pending')}
          className={`flex-1 py-2 text-center text-sm ${
            tab === 'pending'
              ? 'border-b-2 border-blue-500 font-semibold text-blue-500'
              : 'text-gray-400'
          }`}
        >
          신청 중
        </button>
      </div>

      {filteredFriends.length === 0 ? (
        <p className="text-sm text-center text-gray-500 dark:text-gray-400">
          표시할 친구가 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {filteredFriends.map((friend) => {
            const profileUrl = `/protected/social/${friend.profile.nickname}-${friend.profile.tag}`;
            const content = (
              <li
                key={friend.profile.id}
                className="flex items-center justify-between p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700"
              >
                <div className="flex items-center gap-4">
                  {friend.profile.profile_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={friend.profile.profile_image}
                      alt="프로필 이미지"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-white">
                      {friend.profile.nickname[0]}
                    </div>
                  )}
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {friend.profile.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {friend.profile.nickname}#{friend.profile.tag}
                    </div>
                  </div>
                </div>
                {!friend.accepted && tab === 'pending' && friend.isRecipient && (
                  <button
                    onClick={() => acceptFriend(friend.profile.id)}
                    className="text-xs px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    수락
                  </button>
                )}
                {!friend.accepted && tab === 'pending' && !friend.isRecipient && (
                  <span className="text-xs px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100">
                    수락 대기중
                  </span>
                )}
              </li>
            );

            return friend.accepted ? (
              <Link key={friend.profile.id} href={profileUrl}>
                {content}
              </Link>
            ) : (
              content
            );
          })}
        </ul>
      )}
    </div>
  );
}
