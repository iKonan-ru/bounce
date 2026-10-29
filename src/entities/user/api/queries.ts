import { queryKeys, getCollection, pb, Collections } from '@/shared/api';
import { queryOptions } from '@tanstack/react-query';
import type { User } from '../types/user';

/** Все пользователи по имени */
export const usersQuery = queryOptions({
  queryKey: queryKeys.users.all,
  queryFn: () =>
    getCollection(pb, Collections.Users).getFullList<User>({ sort: 'name' }),
});
