'server-only';

import prisma from '@/libs/prisma/instance';
import { GroupType } from '@prisma/client';

export function getNoteWithUserGroupTopics(noteId: string, requestUserId: string) {
  return prisma.note
    .findUnique({
      where: {
        id: noteId,
        OR: [
          { Group: null },
          { Group: { type: GroupType.BLOG } },
          { Group: { type: GroupType.PRIVATE, Members: { some: { userId: requestUserId } } } },
        ],
      },
      include: {
        User: true,
        Group: true,
        Topics: { include: { Topic: true }, orderBy: { order: 'asc' } },
      },
    })
    .catch((e) => {
      console.error(e);
      throw new Error('Error occurred while fetching note');
    });
}

export function getNotesWithUserGroupTopics(requestUserId: string, take?: number, skip?: number) {
  return prisma.note
    .findMany({
      where: {
        userId: requestUserId,
        OR: [
          { Group: null },
          { Group: { type: GroupType.BLOG } },
          { Group: { type: GroupType.PRIVATE, Members: { some: { userId: requestUserId } } } },
        ],
      },
      orderBy: { releasedAt: 'desc' },
      take,
      skip,
      include: {
        User: true,
        Group: true,
        Topics: { include: { Topic: true } },
      },
    })
    .catch((e) => {
      console.error(e);
      throw new Error('Error occurred while fetching notes');
    });
}

export function getCommentedNotesWithUserGroupTopics(requestUserId: string, take?: number, skip?: number) {
  return prisma.note
    .findMany({
      where: {
        Comments: { some: { userId: requestUserId } },
        OR: [
          { Group: null },
          { Group: { type: GroupType.BLOG } },
          { Group: { type: GroupType.PRIVATE, Members: { some: { userId: requestUserId } } } },
        ],
      },
      orderBy: { releasedAt: 'desc' }, // ToDo: Sort by user's latest comment date
      take,
      skip,
      include: {
        User: true,
        Group: true,
        Topics: { include: { Topic: true } },
      },
    })
    .catch((e) => {
      console.error(e);
      throw new Error('Error occurred while fetching notes');
    });
}

// if you change this function, you should change getNotesCountByGroupId too
export function getNotesWithUserGroupTopicsByGroupId(
  groupId: string,
  requestUserId: string,
  take?: number,
  skip?: number
) {
  return prisma.note
    .findMany({
      where: {
        Group: { id: groupId },
        OR: [
          { Group: null },
          { Group: { type: GroupType.BLOG } },
          { Group: { type: GroupType.PRIVATE, Members: { some: { userId: requestUserId } } } },
        ],
      },
      orderBy: { releasedAt: 'desc' },
      take,
      skip,
      include: {
        User: true,
        Group: true,
        Topics: { include: { Topic: true } },
      },
    })
    .catch((e) => {
      console.error(e);
      throw new Error('Error occurred while fetching notes');
    });
}

export function getNotesWithUserGroupTopicsByTopicId(
  topicId: string,
  requestUserId: string,
  take?: number,
  skip?: number
) {
  return prisma.note
    .findMany({
      where: {
        Topics: { some: { topicId } },
        OR: [
          { Group: null },
          { Group: { type: GroupType.BLOG } },
          { Group: { type: GroupType.PRIVATE, Members: { some: { userId: requestUserId } } } },
        ],
      },
      orderBy: { releasedAt: 'desc' },
      take,
      skip,
      include: {
        User: true,
        Group: true,
        Topics: { include: { Topic: true } },
      },
    })
    .catch((e) => {
      console.error(e);
      throw new Error('Error occurred while fetching notes');
    });
}

// if you change this function, you should change getNotesWithUserGroupTopicsByGroupId too
export function getNotesCountByGroupId(groupId: string, requestUserId: string) {
  return prisma.note
    .count({
      where: {
        Group: { id: groupId },
        OR: [
          { Group: null },
          { Group: { type: GroupType.BLOG } },
          { Group: { type: GroupType.PRIVATE, Members: { some: { userId: requestUserId } } } },
        ],
      },
    })
    .catch((e) => {
      console.error(e);
      throw new Error('Error occurred while fetching notes');
    });
}

export function getTimelineNotesWithUserGroupTopics(userId: string, take?: number, skip?: number) {
  return prisma.note.findMany({
    where: {
      AND: [
        {
          OR: [
            { Group: null },
            { Group: { type: GroupType.BLOG } },
            { Group: { type: GroupType.PRIVATE, Members: { some: { userId } } } },
          ],
        },
        {
          OR: [
            { User: { FollowingUsers: { some: { fromUserId: userId } } } },
            { Group: { FollowedUsers: { some: { userId } } } },
            { Topics: { some: { Topic: { FollowedUsers: { some: { userId } } } } } },
          ],
        },
      ],
    },
    orderBy: { releasedAt: 'desc' },
    include: {
      User: true,
      Group: true,
      Topics: { include: { Topic: true } },
    },
    take,
    skip,
  });
}
