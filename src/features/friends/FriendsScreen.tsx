import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { confirmThen } from '@/lib/confirm';
import { Button, ErrorMessage, Screen, SectionHeader, Text, TextField } from '@/ui';

import { useFriendAction, useFriends, useProfileSearch, type SearchResult } from './api';
import { isSearchable } from './friendships';
import { PersonRow } from './PersonRow';

function SearchResultRow({ result }: { result: SearchResult }) {
  const { t } = useTranslation();
  const request = useFriendAction('request_friend');
  const actions = {
    none: (
      <Button
        label={t('friends.add')}
        variant="outline"
        busy={request.isPending}
        onPress={() => request.mutate(result.id)}
      />
    ),
    request_received: <Button label={t('friends.accept')} onPress={() => request.mutate(result.id)} />,
    request_sent: <Text variant="small">{t('friends.requested')}</Text>,
    friends: null,
    blocked: null,
  };
  return <PersonRow name={result.full_name} photoUrl={result.avatar_url} actions={actions[result.friendship]} />;
}

/** Find friends and handle requests. Opened from Me. */
export function FriendsScreen() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const { data } = useFriends();
  const search = useProfileSearch(query);
  const accept = useFriendAction('request_friend');
  const decline = useFriendAction('decline_friend_request');
  const remove = useFriendAction('remove_friendship');
  const block = useFriendAction('block_user');
  const person = (id: string) => data?.people.get(id);

  return (
    <Screen back>
      <Text variant="title" role="heading">
        {t('friends.title')}
      </Text>
      <TextField
        placeholder={t('friends.searchPlaceholder')}
        accessibilityLabel={t('friends.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {query.trim() && !isSearchable(query) ? <Text variant="caption">{t('friends.searchHint')}</Text> : null}
      {search.data?.length === 0 ? <Text variant="small">{t('friends.noResults')}</Text> : null}
      {search.data?.map((result) => (
        <SearchResultRow key={result.id} result={result} />
      ))}

      {data?.incoming.length ? <SectionHeader title={t('friends.requests')} /> : null}
      {data?.incoming.map((id) => (
        <PersonRow
          key={id}
          name={person(id)?.full_name ?? ''}
          photoUrl={person(id)?.avatar_url ?? null}
          actions={
            <>
              <Button label={t('friends.accept')} onPress={() => accept.mutate(id)} />
              <Button label={t('friends.decline')} variant="quiet" onPress={() => decline.mutate(id)} />
            </>
          }
        />
      ))}

      <SectionHeader title={t('friends.mine')} />
      {data?.friends.length === 0 ? <Text variant="small">{t('friends.none')}</Text> : null}
      {data?.friends.map((id) => {
        const name = person(id)?.full_name ?? '';
        return (
          <PersonRow
            key={id}
            name={name}
            photoUrl={person(id)?.avatar_url ?? null}
            actions={
              <>
                <Button label={t('friend.profile')} variant="quiet" onPress={() => router.push(`/friend/${id}`)} />
                <Button
                  label={t('friends.remove')}
                  variant="quiet"
                  onPress={() => confirmThen(t('friends.removeConfirm', { name }), () => remove.mutate(id))}
                />
                <Button
                  label={t('friends.block')}
                  variant="quiet"
                  onPress={() => confirmThen(t('friends.blockConfirm', { name }), () => block.mutate(id))}
                />
              </>
            }
          />
        );
      })}

      {data?.outgoing.map((id) => (
        <PersonRow
          key={id}
          name={person(id)?.full_name ?? ''}
          photoUrl={person(id)?.avatar_url ?? null}
          actions={<Button label={t('friends.cancelRequest')} variant="quiet" onPress={() => remove.mutate(id)} />}
        />
      ))}
      {data?.blocked.map((id) => (
        <PersonRow
          key={id}
          name={person(id)?.full_name ?? ''}
          photoUrl={person(id)?.avatar_url ?? null}
          actions={<Button label={t('friends.unblock')} variant="quiet" onPress={() => remove.mutate(id)} />}
        />
      ))}
      <ErrorMessage error={accept.error ?? decline.error ?? remove.error ?? block.error} />
    </Screen>
  );
}
