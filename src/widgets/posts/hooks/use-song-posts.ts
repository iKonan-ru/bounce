import { useState } from 'react';
import type { Post } from '@/entities/post';
import { postsQuery, getSongPosts } from '@/entities/post';
import type { Song } from '@/entities/song';
import { songsQuery } from '@/entities/song';
import { useQuery } from '@tanstack/react-query';
import type { UseSongPostsResult } from '../types/song-posts';

/** Логика публикаций песни: список и открытая публикация */
export function useSongPosts(song: Song): UseSongPostsResult {
  const songs = useQuery(songsQuery(song.project));
  const posts = useQuery(postsQuery(song.project));
  const [openId, setOpenId] = useState<string>();
  const songList = songs.data ?? [song];
  const songPosts = getSongPosts(posts.data ?? [], song.id, songList);
  const openedPost = posts.data?.find((post) => post.id === openId);
  const onPostOpen = (postId: string): void => {
    setOpenId(postId);
  };
  const onPostCreated = (post: Post): void => {
    setOpenId(post.id);
  };
  const onDialogOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      setOpenId(undefined);
    }
  };

  return {
    songList,
    songPosts,
    hasPosts: songPosts.length > 0,
    openedPost,
    onPostOpen,
    onPostCreated,
    onDialogOpenChange,
  };
}
