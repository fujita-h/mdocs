'use server';

import { getSessionUser } from '@/libs/auth/utils';
import aoai from '@/libs/azure/openai/instance';
import blob from '@/libs/azure/storeage-blob/instance';
import es from '@/libs/elasticsearch/instance';
import { checkPostableGroup } from '@/libs/prisma/group';
import prisma from '@/libs/prisma/instance';
import { generateTipTapText } from '@/libs/tiptap/text';
import { get_encoding } from '@dqbd/tiktoken';
import { init as initCuid } from '@paralleldrive/cuid2';

const cuid = initCuid({ length: 24 });

export async function processAutoSave(
  draftId: string,
  groupId: string | undefined,
  relatedNoteId: string | undefined,
  title?: string,
  topics?: string[],
  body?: string
) {
  const user = await getSessionUser();
  if (!user || !user.id) throw new Error('Unauthorized');

  if (groupId) {
    const postable = await checkPostableGroup(user.id, groupId).catch((err) => false);
    if (!postable) throw new Error('Forbbiden');
  }

  const metadata = {
    userId: user.id,
    groupId: groupId || 'n/a',
    userName: encodeURI(user.name || 'n/a'),
    oid: user.oid || 'n/a',
    uid: user.uid || 'n/a',
  };

  // Each blob can have up to 10 blob index tags.
  // Tag values must be alphanumeric and valid special characters (space, plus, minus, period, colon, equals, underscore, forward slash).
  // Tag keys must be between one and 128 characters.
  // Tag values must be between zero and 256 characters.
  const tags = {
    userId: user.id,
    groupId: groupId || 'n/a',
    oid: user.oid || 'n/a',
    uid: user.uid || 'n/a',
  };

  let blobName = undefined;
  if (body !== undefined) {
    // create TipTap text for check valid json
    const bodyText = generateTipTapText(body);

    blobName = `${draftId}/${cuid()}`;
    const blobUploadResult = await blob
      .upload('drafts', blobName, 'application/json', body, metadata, tags)
      .then((res) => res._response.status)
      .catch((err) => 500);

    if (blobUploadResult !== 201) throw new Error('Failed to upload draft');
  }

  let _topics = undefined;
  if (topics !== undefined) {
    _topics = {
      deleteMany: { draftId: draftId },
      create: topics.map((topic) => ({ topicId: topic, order: topics.indexOf(topic) })),
    };
  }

  const draft = await prisma.draft
    .update({
      where: { id: draftId, userId: user.id },
      data: {
        title: title,
        groupId: groupId,
        relatedNoteId: relatedNoteId,
        Topics: _topics,
        bodyBlobName: blobName,
      },
    })
    .catch((err) => null);

  if (!draft) {
    if (blobName) await blob.delete('drafts', blobName).catch((err) => null);
    throw new Error('Failed to update draft');
  }

  return draft;
}

export async function processDraft(
  draftId: string,
  groupId: string | undefined,
  relatedNoteId: string | undefined,
  title: string,
  topics: string[],
  body?: string
) {
  const user = await getSessionUser();
  if (!user || !user.id) throw new Error('Unauthorized');

  if (body === undefined) {
    throw new Error('body is undefined');
  }

  if (groupId) {
    const postable = await checkPostableGroup(user.id, groupId).catch((err) => false);
    if (!postable) throw new Error('Forbbiden');
  }

  const metadata = {
    userId: user.id,
    groupId: groupId || 'n/a',
    userName: encodeURI(user.name || 'n/a'),
    oid: user.oid || 'n/a',
    uid: user.uid || 'n/a',
  };

  // Each blob can have up to 10 blob index tags.
  // Tag values must be alphanumeric and valid special characters (space, plus, minus, period, colon, equals, underscore, forward slash).
  // Tag keys must be between one and 128 characters.
  // Tag values must be between zero and 256 characters.
  const tags = {
    userId: user.id,
    groupId: groupId || 'n/a',
    oid: user.oid || 'n/a',
    uid: user.uid || 'n/a',
  };

  // create TipTap text for check valid json
  const bodyText = generateTipTapText(body);

  const blobName = `${draftId}/${cuid()}`;
  const blobUploadResult = await blob
    .upload('drafts', blobName, 'application/json', body, metadata, tags)
    .then((res) => res._response.status)
    .catch((err) => 500);

  if (blobUploadResult !== 201) throw new Error('Failed to upload draft');

  const draft = await prisma.draft
    .update({
      where: { id: draftId, userId: user.id },
      data: {
        title: title,
        groupId: groupId,
        relatedNoteId: relatedNoteId,
        Topics: {
          deleteMany: { draftId: draftId },
          create: topics.map((topic) => ({ topicId: topic, order: topics.indexOf(topic) })),
        },
        bodyBlobName: blobName,
      },
    })
    .catch((err) => null);

  if (!draft) {
    await blob.delete('drafts', blobName).catch((err) => null);
    throw new Error('Failed to update draft');
  }

  return draft;
}

export async function processPublish(
  draftId: string,
  groupId: string | undefined,
  relatedNoteId: string | undefined,
  title: string,
  topics: string[],
  body?: string
) {
  const user = await getSessionUser();
  if (!user || !user.id) throw new Error('Unauthorized');
  const userId = user.id;

  if (body === undefined) {
    throw new Error('body is undefined');
  }

  if (groupId) {
    const postable = await checkPostableGroup(user.id, groupId).catch((err) => false);
    if (!postable) throw new Error('Forbbiden');
  }

  const metadata = {
    userId: user.id,
    groupId: groupId || 'n/a',
    userName: encodeURI(user.name || 'n/a'),
    oid: user.oid || 'n/a',
    uid: user.uid || 'n/a',
  };

  // Each blob can have up to 10 blob index tags.
  // Tag values must be alphanumeric and valid special characters (space, plus, minus, period, colon, equals, underscore, forward slash).
  // Tag keys must be between one and 128 characters.
  // Tag values must be between zero and 256 characters.
  const tags = {
    userId: user.id,
    groupId: groupId || 'n/a',
    oid: user.oid || 'n/a',
    uid: user.uid || 'n/a',
  };

  // create TipTap text
  const bodyText = generateTipTapText(body);

  // count body tokens, if it's over 8000, slice it
  const encoding = await get_encoding('cl100k_base');
  const tokens = await encoding.encode(bodyText);
  const token_slice = tokens.slice(0, 8000);
  const body_slice = new TextDecoder().decode(encoding.decode(token_slice));
  encoding.free();

  // get embedding
  const embed = await aoai
    .getEmbedding(body_slice)
    .then((res) => {
      const data = res.data;
      if (data.length === 0) {
        return [] as number[];
      }
      return data[0].embedding;
    })
    .catch((err) => {
      console.error(err);
      return [] as number[];
    });

  if (relatedNoteId) {
    // update note
    const blobName = `${relatedNoteId}/${cuid()}`;
    const blobUploadResult = await blob
      .upload('notes', blobName, 'application/json', body, metadata, tags)
      .then((res) => res._response.status)
      .catch((err) => 500);
    if (blobUploadResult !== 201) throw new Error('Failed to upload note');

    const note = await prisma.$transaction(async (tx) => {
      const note = await tx.note.update({
        where: { id: relatedNoteId, userId: user.id, Drafts: { some: { id: draftId } } },
        data: {
          title: title,
          groupId: groupId,
          Topics: {
            deleteMany: { noteId: relatedNoteId },
            create: topics.map((topic) => ({ topicId: topic, order: topics.indexOf(topic) })),
          },
          bodyBlobName: blobName,
        },
        include: {
          User: { select: { uid: true, handle: true, name: true } },
          Group: { select: { handle: true, name: true, type: true } },
          Topics: { select: { topicId: true, Topic: { select: { handle: true, name: true } }, order: true } },
        },
      });
      await es.create('notes', note.id, { ...note, body: bodyText, body_embed_ada_002: embed });
      await tx.draft.delete({ where: { id: draftId } });
      return note;
    });

    if (!note) {
      await blob.delete('notes', blobName).catch((err) => null);
      throw new Error('Failed to update note');
    }
    return note;
  } else {
    // create note
    const noteId = cuid();
    const blobName = `${noteId}/${cuid()}`;
    const blobUploadResult = await blob
      .upload('notes', blobName, 'application/json', body, metadata, tags)
      .then((res) => res._response.status)
      .catch((err) => 500);
    if (blobUploadResult !== 201) throw new Error('Failed to upload note');

    const note = await prisma.$transaction(async (tx) => {
      const note = await tx.note.create({
        data: {
          id: noteId,
          userId: userId,
          title: title,
          groupId: groupId,
          Topics: {
            create: topics.map((topic) => ({ topicId: topic, order: topics.indexOf(topic) })),
          },
          bodyBlobName: blobName,
          releasedAt: new Date(),
        },
        include: {
          User: { select: { uid: true, handle: true, name: true } },
          Group: { select: { handle: true, name: true, type: true } },
          Topics: { select: { topicId: true, Topic: { select: { handle: true, name: true } }, order: true } },
        },
      });
      await es.create('notes', note.id, { ...note, body: bodyText, body_embed_ada_002: embed });
      await tx.draft.delete({ where: { id: draftId } });
      return note;
    });

    if (!note) {
      await blob.delete('notes', blobName).catch((err) => null);
      throw new Error('Failed to update note');
    }
    return note;
  }
}

export async function textCompletion(prompt: string) {
  const systemPrompt =
    'ナレッジベースの作成をしています。途中まで書かれた以下の文章の続きを出力してください。\n---\n\n';
  return aoai.getCompletion(systemPrompt + prompt).then((res) => res.choices[0].text);
}
