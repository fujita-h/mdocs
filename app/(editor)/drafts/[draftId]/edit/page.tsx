import { SignInForm } from '@/components/auth/sign-in-form';
import { Error404, Error500 } from '@/components/error';
import { auth } from '@/libs/auth';
import { getUserIdFromSession } from '@/libs/auth/utils';
import blob from '@/libs/azure/storeage-blob/instance';
import { getDraftWithGroupTopics } from '@/libs/prisma/draft';
import { getTopics } from '@/libs/prisma/topic';
import { getUserSetting } from '@/libs/prisma/user-setting';
import { Form } from './form';

export default async function Page({ params }: { params: { draftId: string } }) {
  const session = await auth();
  const { status, userId, error } = await getUserIdFromSession(session, true);
  if (status === 401) return <SignInForm />;
  if (status === 500) return <Error500 />;
  if (status === 404 || !userId) return <Error404 />;
  if (!params.draftId) return <Error404 />;

  const [setting, draft, topicOptions] = await Promise.all([
    getUserSetting(userId).catch((e) => ({ editorShowNewLineFloatingMenu: true })),
    getDraftWithGroupTopics(userId, params.draftId).catch((e) => null),
    getTopics().catch((e) => []),
  ]);

  if (!draft) return <Error404 />;

  let body = '';
  if (draft?.id && draft?.bodyBlobName) {
    body = await blob
      .downloadToBuffer('drafts', draft.bodyBlobName)
      .then((res) => res.toString('utf-8'))
      .catch((e) => '');
  }

  return (
    <Form
      setting={setting}
      draftId={draft.id}
      groupId={draft.groupId || undefined}
      relatedNoteId={draft.relatedNoteId || undefined}
      title={draft.title || ''}
      body={body}
      topics={draft?.Topics.map((t) => t.Topic) || []}
      topicOptions={topicOptions}
    />
  );
}
